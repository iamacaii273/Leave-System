require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const pool = require('./src/db');

const DEFAULT_TYPES = [
  {
    name: 'Sick Leave',
    default_days_per_year: 30,
    description: 'A type of paid or unpaid time off from work. It is authorized absence permitted due to illness, injury, or to attend to medical needs.',
    color_type: 'green',
    icon_name: 'thermometer',
    requires_attachment: 1,
    requires_manager_approval: 0,
    carryover: 0,
    min_service_months: 0
  },
  {
    name: 'Annual Leave',
    default_days_per_year: 6,
    description: 'A stipulated period of paid time off work granted by employers, allowing employees to rest, travel, or handle personal matters without losing income',
    color_type: 'orange',
    icon_name: 'umbrella',
    requires_attachment: 0,
    requires_manager_approval: 1,
    carryover: 1,
    min_service_months: 12
  },
  {
    name: 'Personal Leave',
    default_days_per_year: 3,
    description: 'Unique or unforeseen personal situations that are not covered by standard sick leave or vacation time (PTO)',
    color_type: 'blue',
    icon_name: 'user',
    requires_attachment: 0,
    requires_manager_approval: 1,
    carryover: 0,
    min_service_months: 0
  }
];

async function backfill() {
  console.log("Starting backfill process...");
  try {
    const currentYear = new Date().getFullYear();
    const now = new Date();

    // 1. Get all departments
    const [departments] = await pool.query("SELECT id, name FROM departments WHERE is_active = 1");
    console.log(`Found ${departments.length} active departments.`);

    for (const dept of departments) {
      console.log(`\nProcessing Department: ${dept.name} (${dept.id})`);

      for (const defaultType of DEFAULT_TYPES) {
        // Check if this department already has this leave type
        const [existing] = await pool.query(
          `SELECT lt.id FROM leave_types lt
           JOIN leave_type_departments ltd ON lt.id = ltd.leave_type_id
           WHERE ltd.department_id = ? AND lt.name = ? AND lt.is_active = 1`,
          [dept.id, defaultType.name]
        );

        if (existing.length > 0) {
          console.log(`  - [SKIP] '${defaultType.name}' already exists.`);
          continue;
        }

        // Create the leave type
        const ltId = uuidv4();
        await pool.query(
          `INSERT INTO leave_types
             (id, name, default_days_per_year, description, color_type, icon_name, requires_attachment, requires_manager_approval, carryover, min_service_months)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ltId, defaultType.name, defaultType.default_days_per_year, defaultType.description,
            defaultType.color_type, defaultType.icon_name, defaultType.requires_attachment,
            defaultType.requires_manager_approval, defaultType.carryover, defaultType.min_service_months
          ]
        );

        // Assign to department
        await pool.query(
          "INSERT INTO leave_type_departments (leave_type_id, department_id) VALUES (?, ?)",
          [ltId, dept.id]
        );
        console.log(`  - [CREATED] '${defaultType.name}'`);

        // Auto-provision balances for existing employees in this department
        const [users] = await pool.query(
          `SELECT u.id, u.hire_date FROM users u 
           JOIN roles r ON u.role_id = r.id 
           WHERE u.is_active = 1 AND r.name = 'Employee' AND u.department_id = ?`,
          [dept.id]
        );

        const eligibleUsers = users.filter(u => {
          if (!u.hire_date) return defaultType.min_service_months === 0;
          const hireDate = new Date(u.hire_date);
          const serviceMonths = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());
          return serviceMonths >= defaultType.min_service_months;
        });

        if (eligibleUsers.length > 0) {
          const inserts = eligibleUsers.map(u => [
            uuidv4(), u.id, ltId, currentYear, defaultType.default_days_per_year, 0, defaultType.default_days_per_year
          ]);

          await pool.query(
            `INSERT INTO leave_balances
               (id, user_id, leave_type_id, year, total_days, used_days, remaining_days)
             VALUES ?`,
            [inserts]
          );
          console.log(`    -> Provisioned balances for ${eligibleUsers.length} employee(s).`);
        } else {
          console.log(`    -> No eligible employees for balance provisioning.`);
        }
      }
    }

    console.log("\n✅ Backfill completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during backfill:", error);
    process.exit(1);
  }
}

backfill();
