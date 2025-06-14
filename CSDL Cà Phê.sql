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
   INSERT INTO categories (name) VALUES
('Cà Phê'),
('A-Mê'),
('Trái Cây Xay 0°C'),
('Trà Trái Cây - HiTea'),
('Trà Sữa'),
('Matcha Tây Bắc'),
('Chocolate'),
('Matcha Kyoto'),
('Thức uống đá xay');
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
UPDATE users SET role = 'admin' WHERE username = 'admin';