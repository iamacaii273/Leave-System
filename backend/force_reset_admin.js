const bcrypt = require('bcrypt');
const pool = require('./src/db');

async function main() {
  try {
    const newPassword = '123'; // ตั้งรหัสผ่านสั้นๆ เป็น 123 เพื่อทดสอบก่อน
    const email = 'superadmin@system.com';
    const hash = await bcrypt.hash(newPassword, 10);
    
    // 1. ค้นหาว่ามี user นี้จริงๆ หรือไม่ และ role เป็น Super Admin ไหม
    const [users] = await pool.query(`
      SELECT u.id, u.username, u.email, u.is_active, u.deleted_at, r.name as role 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.email = ?
    `, [email]);

    if (users.length === 0) {
      console.log('❌ ไม่พบผู้ใช้งานอีเมล', email);
    } else {
      const user = users[0];
      console.log('✅ พบข้อมูลผู้ใช้งาน:');
      console.log('- Username:', user.username);
      console.log('- Role:', user.role);
      console.log('- Is Active (1=Yes, 0=No):', user.is_active);
      console.log('- Deleted At:', user.deleted_at);

      // 2. อัปเดตรหัสผ่าน + มั่นใจว่าบัญชีไม่ได้ถูกล็อค (is_active = 1) และไม่ถูกลบ (deleted_at = NULL)
      await pool.query(
        "UPDATE users SET password_hash = ?, is_active = 1, deleted_at = NULL WHERE email = ?",
        [hash, email]
      );
      
      console.log('\n✅ รีเซ็ตรหัสผ่านและสถานะบัญชีสำเร็จ!');
      console.log('=============================');
      console.log('📍 Email:    superadmin@system.com');
      console.log('🔑 Password: 123');
      console.log('=============================');
    }

  } catch(e) {
    console.error('เกิดข้อผิดพลาด:', e);
  } finally {
    process.exit(0);
  }
}

main();
