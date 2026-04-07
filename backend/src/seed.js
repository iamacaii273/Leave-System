const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
const pool = require('./db')
require('dotenv').config()

// ─── Fixed IDs so the script is safe to run multiple times ───────────────────

const ROLE = {
  EMPLOYEE:    'rl000001-0000-0000-0000-000000000001',
  MANAGER:     'rl000001-0000-0000-0000-000000000002',
  HR:          'rl000001-0000-0000-0000-000000000003',
  SUPER_ADMIN: 'rl000001-0000-0000-0000-000000000004',
}

const POSITION = {
  DEVELOPER:   'ps000001-0000-0000-0000-000000000001',
  HR_OFFICER:  'ps000001-0000-0000-0000-000000000002',
  SUPER_ADMIN: 'ps000001-0000-0000-0000-000000000003',
  MANAGER:     'ps000001-0000-0000-0000-000000000010', // new
}

const LEAVE_TYPE = {
  SICK:     'lt000001-0000-0000-0000-000000000001',
  PERSONAL: 'lt000001-0000-0000-0000-000000000002',
  ANNUAL:   'lt000001-0000-0000-0000-000000000003',
}

const USERS = [
  {
    id:       'us000001-0000-0000-0000-000000000001',
    username: 'hr_officer',
    full_name: 'HR Officer',
    email:    'hr@company.com',
    password: 'Hr@1234',
    role_id:  ROLE.HR,
    position_id: POSITION.HR_OFFICER,
    hire_date: '2023-01-10',
  },
  {
    id:       'us000001-0000-0000-0000-000000000002',
    username: 'manager_one',
    full_name: 'Manager One',
    email:    'manager@company.com',
    password: 'Manager@1234',
    role_id:  ROLE.MANAGER,
    position_id: POSITION.MANAGER,
    hire_date: '2022-06-01',
  },
  {
    id:       'us000001-0000-0000-0000-000000000003',
    username: 'employee_one',
    full_name: 'Employee One',
    email:    'employee@company.com',
    password: 'Employee@1234',
    role_id:  ROLE.EMPLOYEE,
    position_id: POSITION.DEVELOPER,
    hire_date: '2024-03-15',
  },
]

const CURRENT_YEAR = new Date().getFullYear()

// Leave balances for employee_one
const BALANCES = [
  {
    id: uuidv4(),
    user_id: 'us000001-0000-0000-0000-000000000003',
    leave_type_id: LEAVE_TYPE.SICK,
    year: CURRENT_YEAR,
    total_days: 30,
    used_days: 0,
    remaining_days: 30,
  },
  {
    id: uuidv4(),
    user_id: 'us000001-0000-0000-0000-000000000003',
    leave_type_id: LEAVE_TYPE.PERSONAL,
    year: CURRENT_YEAR,
    total_days: 3,
    used_days: 0,
    remaining_days: 3,
  },
  {
    id: uuidv4(),
    user_id: 'us000001-0000-0000-0000-000000000003',
    leave_type_id: LEAVE_TYPE.ANNUAL,
    year: CURRENT_YEAR,
    total_days: 6,
    used_days: 0,
    remaining_days: 6,
  },
]

async function seed() {
  console.log('🌱 Starting seed...\n')

  // ── 1. Add Manager position ──────────────────────────────────────────────
  console.log('📌 Step 1: Adding Manager position...')
  const [existingPos] = await pool.query(
    'SELECT id FROM positions WHERE id = ?',
    [POSITION.MANAGER]
  )

  if (existingPos.length > 0) {
    console.log('   ⚠️  Manager position already exists — skipping.')
  } else {
    await pool.query(
      'INSERT INTO positions (id, role_id, name) VALUES (?, ?, ?)',
      [POSITION.MANAGER, ROLE.MANAGER, 'Team Manager']
    )
    console.log('   ✅ Manager position created.')
  }

  // ── 2. Create test users ─────────────────────────────────────────────────
  console.log('\n👤 Step 2: Creating test users...')

  for (const user of USERS) {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE id = ? OR email = ?',
      [user.id, user.email]
    )

    if (existing.length > 0) {
      console.log(`   ⚠️  User "${user.full_name}" already exists — skipping.`)
      continue
    }

    const password_hash = await bcrypt.hash(user.password, 10)

    await pool.query(
      `INSERT INTO users (id, username, full_name, email, password_hash, role_id, position_id, hire_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.username,
        user.full_name,
        user.email,
        password_hash,
        user.role_id,
        user.position_id,
        user.hire_date,
      ]
    )
    console.log(`   ✅ Created: ${user.full_name} (${user.email}) — password: ${user.password}`)
  }

  // ── 3. Create leave balances for employee ────────────────────────────────
  console.log('\n💰 Step 3: Creating leave balances for Employee One...')

  for (const balance of BALANCES) {
    const [existing] = await pool.query(
      'SELECT id FROM leave_balances WHERE user_id = ? AND leave_type_id = ? AND year = ?',
      [balance.user_id, balance.leave_type_id, balance.year]
    )

    if (existing.length > 0) {
      console.log(`   ⚠️  Balance for leave_type ${balance.leave_type_id} (${balance.year}) already exists — skipping.`)
      continue
    }

    await pool.query(
      `INSERT INTO leave_balances (id, user_id, leave_type_id, year, total_days, used_days, remaining_days)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        balance.id,
        balance.user_id,
        balance.leave_type_id,
        balance.year,
        balance.total_days,
        balance.used_days,
        balance.remaining_days,
      ]
    )
    console.log(`   ✅ Balance created: leave_type ${balance.leave_type_id} — ${balance.total_days} days`)
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────────')
  console.log('✅ Seed complete! Test accounts:\n')
  console.log('  Role        | Email                    | Password')
  console.log('  ------------|--------------------------|----------------')
  console.log('  Super Admin | superadmin@system.com    | Admin@1234')
  console.log('  HR          | hr@company.com           | Hr@1234')
  console.log('  Manager     | manager@company.com      | Manager@1234')
  console.log('  Employee    | employee@company.com     | Employee@1234')
  console.log('────────────────────────────────────────────\n')

  await pool.end()
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
