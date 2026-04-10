const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetPasswords() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const newPassword = 'password123';
    const hash = await bcrypt.hash(newPassword, 10);
    
    const [result] = await pool.query('UPDATE users SET password_hash = ?', [hash]);
    console.log(`Updated ${result.affectedRows} users with the new password: ${newPassword}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

resetPasswords();
