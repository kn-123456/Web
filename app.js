require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;

// Cấu hình SSL/TLS 1.3 Options
const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt'),
    minVersion: 'TLSv1.3' // Ép buộc sử dụng TLS 1.3
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Phục vụ thư mục tĩnh (HTML, CSS, Images, JS)
app.use(express.static(path.join(__dirname)));
app.use('/image', express.static(path.join(__dirname, 'image')));

// 2. KẾT NỐI CSDL MYSQL (DÙNG PROMISE)
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '1234',
    database: process.env.DB_NAME || 'security_demo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

db.getConnection()
    .then(conn => {
        console.log('✅ Kết nối thành công đến MySQL Database: security_demo');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Lỗi kết nối MySQL Database:', err.message);
    });

// 3. CẤU HÌNH NODEMAILER GỬI MAIL CSKH
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'kimmngann10102005@gmail.com',
        pass: 'ymlmoubxcmqfnzln'
    }
});

// 4. ROUTING HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/gioi-thieu', (req, res) => res.sendFile(path.join(__dirname, 'gioi-thieu.html')));
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'menu.html')));
app.get('/tin-tuc', (req, res) => res.sendFile(path.join(__dirname, 'tin-tuc.html')));
app.get('/thanh-vien', (req, res) => res.sendFile(path.join(__dirname, 'thanh-vien.html')));
app.get('/cua-hang', (req, res) => res.sendFile(path.join(__dirname, 'cua-hang.html')));
app.get('/lien-he', (req, res) => res.sendFile(path.join(__dirname, 'lien-he.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));
app.get('/tin-tuc-chi-tiet', (req, res) => res.sendFile(path.join(__dirname, 'tin-tuc-chi-tiet.html')));
app.get('/header.html', (req, res) => res.sendFile(path.join(__dirname, 'header.html')));
app.get('/footer.html', (req, res) => res.sendFile(path.join(__dirname, 'footer.html')));
app.get('/thanh-toan', (req, res) => res.sendFile(path.join(__dirname, 'thanh-toan.html')));
app.get('/tai-khoan', (req, res) => res.sendFile(path.join(__dirname, 'tai-khoan.html')));
app.get('/don-mua', (req, res) => res.sendFile(path.join(__dirname, 'don-mua.html')));

// 5. REST APIs DỮ LIỆU
app.get('/api/products/bestseller', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM products WHERE is_bestseller = 1`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/all', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM products`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/news', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM news ORDER BY id DESC`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/news/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM news WHERE id = ?`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy bài viết" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/banners', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM banners`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stores', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM stores`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/about', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM about_info LIMIT 1`);
        res.json(rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/toppings', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM toppings`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. API TIẾP NHẬN FORM LIÊN HỆ VÀ GỬI MAIL CSKH
app.post('/api/contact', async (req, res) => {
    const { fullname, email, phone, is_store_feedback, message } = req.body;

    if (!fullname || !email || !phone || !message) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng điền đầy đủ thông tin bắt buộc!'
        });
    }

    try {
        const sqlInsert = `INSERT INTO contacts (fullname, email, phone, message) VALUES (?, ?, ?, ?)`;
        await db.query(sqlInsert, [fullname, email, phone, message]);

        try {
            const storeFeedbackNote = is_store_feedback ? '<strong>[Lưu ý: Khách hàng muốn góp ý cửa hàng cụ thể]</strong><br>' : '';
            const mailOptions = {
                from: '"Bông Trà Website" <kimmngann10102005@gmail.com>',
                to: 'nenal82786@deertees.com',
                subject: `[BÔNG TRÀ CSKH] Lời nhắn mới từ ${fullname}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #006030; border-radius: 10px; max-width: 600px; color: #333;">
                        <h2 style="color: #006030; margin-top: 0;">YÊU CẦU LIÊN HỆ MỚI</h2>
                        <p>${storeFeedbackNote}</p>
                        <p><strong>Họ và tên:</strong> ${fullname}</p>
                        <p><strong>Địa chỉ Email:</strong> ${email}</p>
                        <p><strong>Số điện thoại:</strong> ${phone}</p>
                        <p><strong>Nội dung lời nhắn:</strong></p>
                        <blockquote style="background: #f8f9fa; padding: 12px; border-left: 4px solid #006030; margin: 10px 0;">
                            ${message.replace(/\n/g, '<br>')}
                        </blockquote>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
        } catch (mailError) {
            console.error('⚠ Lỗi gửi Email:', mailError.message);
        }

        return res.json({
            success: true,
            message: 'Gửi thông tin liên hệ thành công! Bông Trà sẽ phản hồi sớm nhất.'
        });
    } catch (dbError) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống CSDL!'
        });
    }
});

// 7. BẢO MẬT AES-256-GCM DÀNH CHO USER
const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.AES_SECRET_KEY || '603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4', 'hex');

function encryptAES(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { encryptedData: encrypted, iv: iv.toString('hex'), authTag: cipher.getAuthTag().toString('hex') };
}

function decryptAES(encryptedData, ivHex, authTagHex) {
    try {
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        return "Lỗi giải mã (Dữ liệu bị vi phạm tính toàn vẹn)";
    }
}

// 8. API ĐĂNG KÝ
app.post('/api/register', async (req, res) => {
    const { fullname, phone, username, password, sensitiveData, role } = req.body;
    try {
        const [existing] = await db.query(`SELECT id FROM users WHERE username = ?`, [username]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Tên đăng nhập đã tồn tại, vui lòng thay đổi." });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const encrypted = encryptAES(sensitiveData || '');
        
        const sql = `INSERT INTO users (username, password_hash, role, fullname, phone, sensitive_data_encrypted, iv, auth_tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.query(sql, [username, passwordHash, role || 'User', fullname || '', phone || '', encrypted.encryptedData, encrypted.iv, encrypted.authTag]);
        
        res.json({ message: "Đăng ký an toàn thành công!", username: username });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 9. API ĐĂNG NHẬP CHUẨN
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [results] = await db.query(`SELECT * FROM users WHERE username = ?`, [username]);
        if (results.length === 0) {
            return res.status(400).json({ error: "Sai tên đăng nhập hoặc mật khẩu, vui lòng kiểm tra lại!" });
        }
        
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: "Sai tên đăng nhập hoặc mật khẩu, vui lòng kiểm tra lại!" });
        }

        res.json({ message: "Đăng nhập thành công!", username: user.username });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API phụ tương thích
app.post('/api/secure-login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [results] = await db.query(`SELECT * FROM users WHERE username = ?`, [username]);
        if (results.length === 0) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });

        const decryptedPII = user.sensitive_data_encrypted ? decryptAES(user.sensitive_data_encrypted, user.iv, user.auth_tag) : '';
        res.json({ message: "Đăng nhập thành công!", username: user.username, user: { id: user.id, username: user.username, role: user.role, sensitiveData: decryptedPII } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// KHỞI CHẠY HTTPS SERVER (TLS 1.3)
https.createServer(options, app).listen(HTTPS_PORT, () => {
    console.log(`================================================`);
    console.log(`🚀 Secure Server (TLS 1.3) đang chạy tại: https://localhost:${HTTPS_PORT}`);
    console.log(`================================================`);
});