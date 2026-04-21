const pool = require('./src/db');
async function run() {
  const [hrUsers] = await pool.query("SELECT id, username, email FROM users WHERE username IN ('hrit', 'hrmkt', 'hreng', 'hr_it', 'hr_mkt', 'hr_eng')");
  console.log("HR Users:", hrUsers);
  
  const [mappings] = await pool.query("SELECT user_id, department_id FROM hr_departments");
  console.log("HR Mappings:", mappings);

  const [depts] = await pool.query("SELECT * FROM departments");
  console.log("Departments:", depts);

  const [employees] = await pool.query("SELECT id, username, department_id FROM users WHERE username LIKE 'emp%'");
  console.log("Some Employees:", employees);
  
  process.exit();
}
run();
