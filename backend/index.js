require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Kết nối MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '27102003Vincents',
  database: process.env.DB_NAME || 'caphe'
});

db.connect((err) => {
  if (err) {
    console.error('Lỗi kết nối MySQL:', err);
  } else {
    console.log('Kết nối MySQL thành công!');
  }
});

// Route mẫu: Lấy danh sách sản phẩm
app.get('/products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Route mẫu: Lấy danh sách menu
app.get('/categories', (req, res) => {
  db.query('SELECT * FROM categories', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Route mẫu: Lấy danh sách cửa hàng
app.get('/stores', (req, res) => {
  db.query('SELECT * FROM stores', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Route lấy chi tiết sản phẩm theo id
app.get('/products/:id', (req, res) => {
  db.query('SELECT * FROM products WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    res.json(results[0]);
  });
});

const SECRET = process.env.JWT_SECRET || 'caphe_secret';

// Đăng nhập
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
    const user = results[0];
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '1d' });
    res.json({ token, role: user.role });
  });
});

// Middleware xác thực
function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token không hợp lệ' });
    req.user = user;
    next();
  });
}

// Middleware kiểm tra admin
function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
  }
  next();
}

// Thêm sản phẩm
app.post('/products', auth, isAdmin, (req, res) => {
  const { name, price, image, category_id } = req.body;
  db.query('INSERT INTO products (name, price, image, category_id) VALUES (?, ?, ?, ?)', [name, price, image, category_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, name, price, image, category_id });
  });
});

// Sửa sản phẩm
app.put('/products/:id', auth, isAdmin, (req, res) => {
  const { name, price, image, category_id } = req.body;
  db.query('UPDATE products SET name=?, price=?, image=?, category_id=? WHERE id=?', [name, price, image, category_id, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: req.params.id, name, price, image, category_id });
  });
});

// Xóa sản phẩm
app.delete('/products/:id', auth, isAdmin, (req, res) => {
  db.query('DELETE FROM products WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 