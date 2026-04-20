const pool = require('./src/db');

async function main() {
  const [rows] = await pool.query(
    "SELECT u.username, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'Super Admin' AND u.deleted_at IS NULL"
  );
  console.log(rows);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
