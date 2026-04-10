const pool = require("./src/db");
async function run() {
  try {
    await pool.query("ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(255) DEFAULT NULL;");
    await pool.query("ALTER TABLE users ADD COLUMN reset_password_expires DATETIME DEFAULT NULL;");
    console.log("Migration added successfully.");
  } catch(e) {
    console.error("Migration error:", e.message);
  }
  process.exit();
}
run();
