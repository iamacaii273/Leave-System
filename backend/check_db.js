const pool = require('./src/db');
async function checkDB() {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log("Tables:", tables);
    const [columns] = await pool.query('SHOW COLUMNS FROM users');
    console.log("Users columns:", columns.map(c => c.Field));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
checkDB();
