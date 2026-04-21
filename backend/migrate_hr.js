const pool = require('./src/db');
async function migrate() {
  try {
    // Get all HR users with a department_id
    const [hrUsers] = await pool.query(`
      SELECT u.id, u.department_id 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.name = 'HR' AND u.department_id IS NOT NULL
    `);
    
    let count = 0;
    for (const hr of hrUsers) {
      // Check if mapping already exists
      const [existing] = await pool.query('SELECT 1 FROM hr_departments WHERE user_id = ? AND department_id = ?', [hr.id, hr.department_id]);
      if (existing.length === 0) {
        await pool.query('INSERT INTO hr_departments (user_id, department_id) VALUES (?, ?)', [hr.id, hr.department_id]);
        count++;
        console.log(`Migrated department ${hr.department_id} for HR ${hr.id}`);
      }
    }
    console.log(`Successfully migrated ${count} HR mappings.`);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
migrate();
