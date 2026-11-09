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
const geoip = require('geoip-lite');

const app = express();
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;

// Cấu hình SSL/TLS 1.3
const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt'),
    minVersion: 'TLSv1.3'
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Thư mục tĩnh
app.use(express.static(path.join(__dirname)));
app.use('/image', express.static(path.join(__dirname, 'image')));

// Kết nối CSDL
// Kết nối CSDL bảo mật hơn, không để lộ password mặc định trong code
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4'
});

db.getConnection()
    .then(async conn => {
        console.log('🔒 [SECURE SERVER] Kết nối thành công đến MySQL Database: security_demo');
        try {
            const adminUser = process.env.ADMIN_USERNAME || 'admin';
            const adminPass = process.env.ADMIN_PASSWORD || '1234';
            const [adminCheck] = await conn.query(`SELECT id FROM users WHERE username = ?`, [adminUser]);
            if (adminCheck.length === 0) {
                const hashedPassword = await bcrypt.hash(adminPass, 10);
                await conn.query(
                    `INSERT INTO users (username, password_hash, role, fullname, phone) VALUES (?, ?, ?, ?, ?)`,
                    [adminUser, hashedPassword, 'Admin', 'Quản Trị Viên Bông Trà', '0768530492']
                );
            }
        } catch (seedErr) {
            console.error('Lỗi khởi tạo admin:', seedErr.message);
        }
        conn.release();
    })
    .catch(err => console.error('❌ Lỗi kết nối MySQL:', err.message));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'kimmngann10102005@gmail.com',
        pass: 'ymlmoubxcmqfnzln'
    }
});

// ==================== KHỐI AN TOÀN (PREPARED STATEMENT) ====================
app.get('/api/safe-search', async (req, res) => {
    const productName = req.query.name || '';
    try {
        const query = `SELECT * FROM products WHERE name LIKE ?`;
        const [rows] = await db.query(query, [`%${productName}%`]);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        console.error('[Database Error Log]:', err.message);
        res.status(500).json({ success: false, error: "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau." });
    }
});

// ==================== ROUTING HTML ====================
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
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ==================== REST APIS DỮ LIỆU ĐẦY ĐỦ ====================
app.get('/api/products/bestseller', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM products WHERE is_bestseller = 1`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products/all', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM products`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/news', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM news ORDER BY id DESC`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/news/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM news WHERE id = ?`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy bài viết" });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/banners', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM banners`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stores', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM stores`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/about', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM about_info LIMIT 1`);
        res.json(rows[0] || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/toppings', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM toppings`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Liên hệ & Gửi Mail
app.post('/api/contact', async (req, res) => {
    const { fullname, email, phone, is_store_feedback, message } = req.body;
    if (!fullname || !email || !phone || !message) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc!' });
    }
    try {
        await db.query(`INSERT INTO contacts (fullname, email, phone, message) VALUES (?, ?, ?, ?)`, [fullname, email, phone, message]);
        try {
            const storeFeedbackNote = is_store_feedback ? '<strong>[Lưu ý: Khách hàng muốn góp ý cửa hàng cụ thể]</strong><br>' : '';
            await transporter.sendMail({
                from: '"Bông Trà Website" <kimmngann10102005@gmail.com>',
                to: 'nenal82786@deertees.com',
                subject: `[BÔNG TRÀ CSKH] Lời nhắn mới từ ${fullname}`,
                html: `<p>${storeFeedbackNote}</p><p><strong>Họ tên:</strong> ${fullname}</p><p><strong>Email:</strong> ${email}</p><p><strong>SĐT:</strong> ${phone}</p><p><strong>Lời nhắn:</strong> ${message}</p>`
            });
        } catch (mailError) { console.error('Lỗi gửi mail:', mailError.message); }
        res.json({ success: true, message: 'Gửi liên hệ thành công!' });
    } catch (dbError) {
        res.status(500).json({ success: false, message: 'Lỗi CSDL!' });
    }
});

// Mã hóa AES
const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.AES_SECRET_KEY || '603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4', 'hex');
function encryptAES(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { encryptedData: encrypted, iv: iv.toString('hex'), authTag: cipher.getAuthTag().toString('hex') };
}

// RBAC & RBA Middleware
function verifyAdminRole(req, res, next) {
    const userRole = req.headers['x-user-role'] || 'User';
    if (userRole === 'Admin') next();
    else res.status(403).json({ success: false, error: "403 Forbidden: Không có quyền quản trị!" });
}

app.set('trust proxy', true);

function rbaIpCheckMiddleware(req, res, next) {
    let clientIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '';
    if (clientIp.includes('::ffff:')) clientIp = clientIp.split(':').pop();
    if (clientIp === '::1' || clientIp === '127.0.0.1') clientIp = '8.8.8.8';

    const geo = geoip.lookup(clientIp);
    if (geo && ['CN'].includes(geo.country)) {
        return res.status(403).json({ success: false, error: "403 Forbidden: Truy cập từ quốc gia bị hạn chế!" });
    }
    next();
}

// Admin APIs
app.get('/api/admin/users', verifyAdminRole, async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT id, username, fullname, phone, role FROM users`);
        res.json({ success: true, data: rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/products', verifyAdminRole, async (req, res) => {
    const { name, price, category, description, image_url, is_bestseller } = req.body;
    try {
        await db.query(`INSERT INTO products (name, price, category, description, image_url, is_bestseller) VALUES (?, ?, ?, ?, ?, ?)`, 
            [name, price, category, description || '', image_url, is_bestseller || 0]);
        res.json({ success: true, message: "Thêm sản phẩm thành công!" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/admin/products/:id', verifyAdminRole, async (req, res) => {
    try {
        await db.query(`DELETE FROM products WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: "Xóa sản phẩm thành công!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/contacts', verifyAdminRole, async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM contacts ORDER BY id DESC`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/news', verifyAdminRole, async (req, res) => {
    const { title, content, image_url, category, author, hashtag } = req.body;
    try {
        const created_date = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        await db.query(`INSERT INTO news (title, content, image_url, category, author, hashtag, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [title, content, image_url, category || 'Tin Tức', author || 'Bông Trà', hashtag || '', created_date]);
        res.json({ success: true, message: "Đăng bài viết thành công!" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Đăng ký & Đăng nhập chuẩn an toàn
app.post('/api/register', async (req, res) => {
    const { fullname, phone, username, password, sensitiveData, role } = req.body;
    try {
        const [existing] = await db.query(`SELECT id FROM users WHERE username = ?`, [username]);
        if (existing.length > 0) return res.status(400).json({ error: "Tên đăng nhập đã tồn tại!" });

        const passwordHash = await bcrypt.hash(password, 10);
        const encrypted = encryptAES(sensitiveData || '');
        await db.query(`INSERT INTO users (username, password_hash, role, fullname, phone, sensitive_data_encrypted, iv, auth_tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [username, passwordHash, role || 'User', fullname || '', phone || '', encrypted.encryptedData, encrypted.iv, encrypted.authTag]);
        
        res.json({ message: "Đăng ký an toàn thành công!", username: username });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/login', rbaIpCheckMiddleware, async (req, res) => {
    const { username, password } = req.body;
    try {
        const [results] = await db.query(`SELECT * FROM users WHERE username = ?`, [username]);
        if (results.length === 0) return res.status(400).json({ error: "Sai tên đăng nhập hoặc mật khẩu!" });
        
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: "Sai tên đăng nhập hoặc mật khẩu!" });

        res.json({ message: "Đăng nhập thành công!", username: user.username, role: user.role });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Khởi chạy HTTPS Server an toàn
https.createServer(options, app).listen(HTTPS_PORT, () => {
    console.log(`========================================================`);
    console.log(`🚀 SECURE SERVER (TLS 1.3) đang chạy tại: https://localhost:${HTTPS_PORT}`);
    console.log(`========================================================`);
});