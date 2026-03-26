CREATE DATABASE securex_db;
USE securex_db;

ALTER TABLE users 
ADD COLUMN lock_until DATETIME DEFAULT NULL;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    mfa_code VARCHAR(10) DEFAULT NULL,
    failed_attempts INT DEFAULT 0,
    suspicious_status VARCHAR(20) DEFAULT 'Safe',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
select * from login_history;
CREATE TABLE login_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    role VARCHAR(20),
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default admin user
-- Username: admin
-- Password: Admin@123  (SHA-256 hash)
INSERT INTO users (username, password_hash, role)
VALUES (
    'admin',
    '9f2c3d3f0b4d1c3d8e25c97f5e76e2f1b3f0a5c7c1d79b5d55d5a0f8f11bba2b',
    'admin'
);