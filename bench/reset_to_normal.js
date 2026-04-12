const mysql = require('mysql2/promise');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const PASSWORD_HASH_ITERATIONS = 120000;

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(
        password,
        Buffer.from(salt, 'hex'),
        PASSWORD_HASH_ITERATIONS,
        32,
        'sha256'
    ).toString('hex');
    return { salt, hash };
}

async function main() {
    console.log('🧹 تنظيف النظام والعودة لوضع التشغيل العادي...');
    
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'cabinet_db'
    };

    const connection = await mysql.createConnection(dbConfig);

    try {
        console.log('♻️ مسح البيانات الوهمية (Dossiers, Clients)...');
        await connection.query('DELETE FROM dossiers');
        await connection.query('DELETE FROM clients');
        await connection.query('DELETE FROM users');

        console.log('👤 إعادة إنشاء المستخدم الرئيسي (manager)...');
        const { salt, hash } = hashPassword('1234');
        await connection.query(
            'INSERT INTO users (id, username, passwordHash, passwordSalt, role, data) VALUES (?, ?, ?, ?, ?, ?)',
            [1, 'manager', hash, salt, 'manager', JSON.stringify({ requirePasswordChange: false })]
        );

        console.log('✅ تم التنظيف بنجاح. النظام الآن جاهز لاستقبال بياناتك الحقيقية.');

    } catch (err) {
        console.error('❌ Erreur pendant le cleanup:', err);
    } finally {
        await connection.end();
    }
}

main();
