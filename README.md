# 🔐 Secure Password System

A modern web-based secure login and registration system that uses SHA-256 hashing to protect user passwords.

## 🚀 Features

- 🔐 Password hashing using SHA-256
- 👁️ Show/Hide password toggle
- 📊 Password strength indicator
- 📁 LocalStorage-based user data
- 📜 Login history tracking with timestamps
- 🎨 Stylish UI with glassmorphism design
- 📱 Responsive design for mobile devices
- 📑 Menu-based navigation (Register / Login / History)

## 🛠️ Technologies Used

- HTML
- CSS
- JavaScript

## ⚙️ How It Works

1. User registers → password is hashed using SHA-256
2. Hash is stored instead of actual password
3. During login → entered password is hashed again
4. Hashes are compared for authentication
5. Login activity is stored in history

## 📂 Project Structure
