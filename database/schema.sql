CREATE DATABASE IF NOT EXISTS chat_app;
USE chat_app;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    last_seen DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'photo', 'voice') DEFAULT 'text',
    file_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT 0; 