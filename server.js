require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Thư mục tĩnh
app.use(express.static(path.join(__dirname)));
app.use('/image', express.static(path.join(__dirname, 'image')));

// Kết nối CSDL
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
    .then(conn => {
        console.log('⚠️ [INSECURE SERVER] Kết nối thành công đến MySQL Database: security_demo');
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

// ==================== KHỐI KHÔNG AN TOÀN (SQL INJECTION GÉP CHUỖI) ====================
app.get('/api/unsafe-search', async (req, res) => {
    const productName = req.query.name || '';
    try {
        // Cố ý dùng ghép chuỗi trực tiếp để tạo lỗ hổng SQLi
        const query = `SELECT * FROM products WHERE name LIKE '%${productName}%'`;
        const [rows] = await db.query(query);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        // Trả về lỗi chi tiết cấu trúc CSDL để demo
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== ROUTING HTML ĐẦY ĐỦ ====================
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

// ==================== REST APIS DỮ LIỆU ĐẦY ĐỦ ĐỂ WEB CHẠY BÌNH THƯỜNG ====================
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

// Đăng nhập / Đăng ký lỏng lẻo phục vụ bắt gói tin plaintext HTTP (Wireshark)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Truy vấn lỏng lẻo không băm mật khẩu để lộ plaintext khi bắt gói tin
        const [results] = await db.query(`SELECT * FROM users WHERE username = '${username}' AND password_hash = '${password}'`);
        if (results.length === 0) {
            return res.status(400).json({ error: "Sai tên đăng nhập hoặc mật khẩu!" });
        }
        res.json({ message: "Đăng nhập thành công!", username: results[0].username, role: results[0].role });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/register', async (req, res) => {
    const { username, password, fullname, phone, role } = req.body;
    try {
        await db.query(`INSERT INTO users (username, password_hash, role, fullname, phone) VALUES (?, ?, ?, ?, ?)`, 
            [username, password, role || 'User', fullname || '', phone || '']);
        res.json({ message: "Đăng ký thành công!", username: username });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== API QUẢN TRỊ KHÔNG AN TOÀN (DEMO LỖ HỖNG LEO QUYỀN) ====================
app.get('/api/admin/users', async (req, res) => {
    try {
        // Cố ý không kiểm tra xem header x-user-role có phải là Admin hay không
        const [rows] = await db.query(`SELECT id, username, fullname, phone, role FROM users`);
        res.json({ 
            success: true, 
            vulnerability: "Broken Access Control / Privilege Escalation",
            message: "Cảnh báo: Tài khoản User thường vẫn trót lọt truy cập được tài nguyên quản trị!",
            data: rows 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Khởi chạy HTTP Server không an toàn[cite: 30, 42]
app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`⚠️ INSECURE SERVER (HTTP) đang chạy tại: http://localhost:${PORT}`);
    console.log(`========================================================`);
});