const bcrypt = require('bcrypt');
const pool = require('./src/db');

const accountsToUpdate = [
  { email: 'manager@company.com', newPass: 'Manager@1234' },
  { email: 'employee@company.com', newPass: 'Employee@1234' },
  { email: 'hr@company.com', newPass: 'Hr@1234' },
  { email: 'superadmin@system.com', newPass: 'Admin@1234' }
];

async function main() {
  try {
    console.log('🔄 กำลังอัปเดตรหัสผ่าน...\n');
    let updatedCount = 0;

    for (const acc of accountsToUpdate) {
      // 1. ตรวจสอบก่อนว่ามีอีเมลนี้ในระบบไหม
      const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [acc.email]);
      
      if (users.length > 0) {
        // 2. มีบัญชีอยู่ ให้สร้าง Hash จากรหัสผ่านใหม่
        const hash = await bcrypt.hash(acc.newPass, 10);
        
        // 3. อัปเดตเข้าระบบ
        await pool.query(
          "UPDATE users SET password_hash = ?, is_active = 1, deleted_at = NULL WHERE email = ?",
           [hash, acc.email]
        );
        console.log(`✅ อัปเดตสำเร็จ: ${acc.email} -> ${acc.newPass}`);
        updatedCount++;
      } else {
         console.log(`⚠️ ไม่สามารถอัปเดตได้ (ไม่พบผู้ใช้งานนี้): ${acc.email}`);
      }
    }

    console.log(`\n🎉 อัปเดตเสร็จสิ้นทั้งหมด ${updatedCount} บัญชี`);
  } catch(e) {
    console.error('เกิดข้อผิดพลาด:', e);
  } finally {
    process.exit(0);
  }
}

main();
