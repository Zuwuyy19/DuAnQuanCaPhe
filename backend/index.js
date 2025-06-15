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

// API Giỏ hàng
// Lấy giỏ hàng của user
app.get('/cart', auth, (req, res) => {
  db.query(
    `SELECT c.id as cart_id, ci.id as item_id, p.id as product_id, p.name, p.price, p.image, ci.quantity, ci.size, ci.toppings 
     FROM carts c 
     LEFT JOIN cart_items ci ON c.id = ci.cart_id 
     LEFT JOIN products p ON ci.product_id = p.id 
     WHERE c.user_id = ?`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0 || !results[0].product_id) {
        db.query('INSERT INTO carts (user_id) VALUES (?)', [req.user.id], (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ cart_id: result.insertId, items: [] });
        });
        return;
      }
      const cart = {
        cart_id: results[0].cart_id,
        items: results.map(item => ({
          id: item.item_id,
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
          size: item.size,
          toppings: item.toppings ? JSON.parse(item.toppings) : []
        }))
      };
      res.json(cart);
    }
  );
});

// Thêm sản phẩm vào giỏ hàng
app.post('/cart/items', auth, (req, res) => {
  const { product_id, quantity, size, toppings } = req.body;
  // Kiểm tra sản phẩm tồn tại
  db.query('SELECT * FROM products WHERE id = ?', [product_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    // Lấy hoặc tạo giỏ hàng
    db.query('SELECT id FROM carts WHERE user_id = ?', [req.user.id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      let cartId;
      if (results.length === 0) {
        db.query('INSERT INTO carts (user_id) VALUES (?)', [req.user.id], (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          cartId = result.insertId;
          addItemToCart();
        });
      } else {
        cartId = results[0].id;
        addItemToCart();
      }
      function addItemToCart() {
        // Kiểm tra sản phẩm đã có trong giỏ hàng chưa (cùng size, toppings)
        db.query(
          'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ? AND size = ? AND toppings = ?',
          [cartId, product_id, size || null, toppings ? JSON.stringify(toppings) : null],
          (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) {
              // Cập nhật số lượng
              db.query(
                'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
                [quantity, results[0].id],
                (err) => {
                  if (err) return res.status(500).json({ error: err.message });
                  res.json({ success: true, message: 'Đã cập nhật số lượng sản phẩm trong giỏ hàng' });
                }
              );
            } else {
              // Thêm sản phẩm mới
              db.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity, size, toppings) VALUES (?, ?, ?, ?, ?)',
                [cartId, product_id, quantity, size || null, toppings ? JSON.stringify(toppings) : null],
                (err) => {
                  if (err) return res.status(500).json({ error: err.message });
                  res.json({ success: true, message: 'Đã thêm sản phẩm vào giỏ hàng' });
                }
              );
            }
          }
        );
      }
    });
  });
});

// Cập nhật số lượng sản phẩm trong giỏ hàng
app.put('/cart/items/:itemId', auth, (req, res) => {
  const { quantity } = req.body;
  db.query(
    'UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id IN (SELECT id FROM carts WHERE user_id = ?)',
    [quantity, req.params.itemId, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm trong giỏ hàng' });
      res.json({ success: true, message: 'Đã cập nhật số lượng sản phẩm' });
    }
  );
});

// Xóa sản phẩm khỏi giỏ hàng
app.delete('/cart/items/:itemId', auth, (req, res) => {
  db.query(
    'DELETE FROM cart_items WHERE id = ? AND cart_id IN (SELECT id FROM carts WHERE user_id = ?)',
    [req.params.itemId, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm trong giỏ hàng' });
      res.json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng' });
    }
  );
});

// API Đặt hàng
// Tạo đơn hàng mới
app.post('/orders', auth, (req, res) => {
  const { store_id, payment_method } = req.body;
  // Kiểm tra cửa hàng tồn tại
  db.query('SELECT * FROM stores WHERE id = ?', [store_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
    // Lấy giỏ hàng và tính tổng tiền
    db.query(
      `SELECT ci.*, p.price 
       FROM carts c 
       JOIN cart_items ci ON c.id = ci.cart_id 
       JOIN products p ON ci.product_id = p.id 
       WHERE c.user_id = ?`,
      [req.user.id],
      (err, cartItems) => {
        if (err) return res.status(500).json({ error: err.message });
        if (cartItems.length === 0) return res.status(400).json({ error: 'Giỏ hàng trống' });
        const total_amount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        // Tạo đơn hàng mới
        db.query(
          'INSERT INTO orders (user_id, store_id, total_amount, payment_method) VALUES (?, ?, ?, ?)',
          [req.user.id, store_id, total_amount, payment_method || 'cash'],
          (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            const orderId = result.insertId;
            // Thêm chi tiết đơn hàng
            const orderItems = cartItems.map(item => [orderId, item.product_id, item.quantity, item.price]);
            db.query(
              'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?',
              [orderItems],
              (err) => {
                if (err) return res.status(500).json({ error: err.message });
                // Xóa giỏ hàng
                db.query(
                  'DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ?)',
                  [req.user.id],
                  (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ 
                      success: true, 
                      message: 'Đặt hàng thành công',
                      order_id: orderId,
                      total_amount
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// Lấy danh sách đơn hàng của user
app.get('/orders', auth, (req, res) => {
  db.query(
    `SELECT o.*, s.name as store_name, 
     GROUP_CONCAT(CONCAT(p.name, ' (', oi.quantity, ')') SEPARATOR ', ') as items
     FROM orders o
     JOIN stores s ON o.store_id = s.id
     JOIN order_items oi ON o.id = oi.order_id
     JOIN products p ON oi.product_id = p.id
     WHERE o.user_id = ?
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Lấy chi tiết đơn hàng
app.get('/orders/:id', auth, (req, res) => {
  db.query(
    `SELECT o.*, s.name as store_name, s.address as store_address,
     oi.quantity, oi.price, p.name as product_name, p.image as product_image
     FROM orders o
     JOIN stores s ON o.store_id = s.id
     JOIN order_items oi ON o.id = oi.order_id
     JOIN products p ON oi.product_id = p.id
     WHERE o.id = ? AND o.user_id = ?`,
    [req.params.id, req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
      const order = {
        id: results[0].id,
        store_name: results[0].store_name,
        store_address: results[0].store_address,
        total_amount: results[0].total_amount,
        status: results[0].status,
        created_at: results[0].created_at,
        payment_method: results[0].payment_method,
        items: results.map(item => ({
          product_name: item.product_name,
          product_image: item.product_image,
          quantity: item.quantity,
          price: item.price
        }))
      };
      res.json(order);
    }
  );
});

// Hủy đơn hàng (chỉ cho phép khi đơn hàng ở trạng thái pending)
app.put('/orders/:id/cancel', auth, (req, res) => {
  db.query(
    'UPDATE orders SET status = "cancelled" WHERE id = ? AND user_id = ? AND status = "pending"',
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) {
        return res.status(400).json({ 
          error: 'Không thể hủy đơn hàng. Đơn hàng không tồn tại hoặc không ở trạng thái chờ xác nhận' 
        });
      }
      res.json({ success: true, message: 'Đã hủy đơn hàng' });
    }
  );
});

// API cho admin: Cập nhật trạng thái đơn hàng
app.put('/admin/orders/:id/status', auth, isAdmin, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  }

  db.query(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
      res.json({ success: true, message: 'Đã cập nhật trạng thái đơn hàng' });
    }
  );
});

// API cho admin: Lấy danh sách tất cả đơn hàng
app.get('/admin/orders', auth, isAdmin, (req, res) => {
  db.query(
    `SELECT o.*, u.username, s.name as store_name,
     GROUP_CONCAT(CONCAT(p.name, ' (', oi.quantity, ')') SEPARATOR ', ') as items
     FROM orders o
     JOIN users u ON o.user_id = u.id
     JOIN stores s ON o.store_id = s.id
     JOIN order_items oi ON o.id = oi.order_id
     JOIN products p ON oi.product_id = p.id
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Thanh toán đơn hàng (user xác nhận đã thanh toán)
app.put('/orders/:id/pay', auth, (req, res) => {
  db.query(
    'UPDATE orders SET status = "completed" WHERE id = ? AND user_id = ? AND status NOT IN ("completed", "cancelled")',
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) {
        return res.status(400).json({ error: 'Không thể thanh toán. Đơn hàng không tồn tại hoặc đã hoàn thành/hủy.' });
      }
      res.json({ success: true, message: 'Đã thanh toán đơn hàng!' });
    }
  );
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 