# Backend - CaPhe

## Cài đặt

1. Cài đặt Node.js và MySQL.
2. Cài đặt package:
   ```bash
   npm install
   ```
3. Tạo file `.env` trong thư mục `backend` với nội dung:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=caphe
   PORT=5000
   ```
4. Tạo database và các bảng mẫu:
   ```sql
   CREATE DATABASE IF NOT EXISTS caphe;
   USE caphe;
   CREATE TABLE categories (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) NOT NULL
   );
   CREATE TABLE products (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     price INT,
     image VARCHAR(255),
     category_id INT,
     FOREIGN KEY (category_id) REFERENCES categories(id)
   );
   CREATE TABLE stores (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     address VARCHAR(255)
   );
   CREATE TABLE users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     username VARCHAR(50) NOT NULL UNIQUE,
     password VARCHAR(100) NOT NULL
   );
   INSERT INTO users (username, password) VALUES ('admin', '123456');
   ```
5. Chạy server:
   ```bash
   node index.js
   ```
6. Thêm biến môi trường vào file `.env`:
   ```env
   JWT_SECRET=caphe_secret
   ```

## API mẫu
- `GET /products` - Lấy danh sách sản phẩm
- `GET /categories` - Lấy danh sách menu
- `GET /stores` - Lấy danh sách cửa hàng 

## Đăng nhập
- Gửi POST `/login` với `{ username, password }` để nhận token.
- Thêm `Authorization: Bearer <token>` khi gọi API thêm/sửa/xóa sản phẩm.

## API CRUD sản phẩm
- `POST /products` (cần token)
- `PUT /products/:id` (cần token)
- `DELETE /products/:id` (cần token) 