const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // keep same

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root@1",
    database: "securex_db"
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Connected to MySQL");
    }
});

// ---------------- HASH FUNCTION ----------------
function hashPassword(password) {
    return crypto.createHash("sha256").update(password).digest("hex");
}

// ---------------- REGISTER ----------------
app.post("/register", (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.json({ status: "EMPTY" });
    }

    const checkSql = "SELECT * FROM users WHERE username = ?";
    db.query(checkSql, [username], (err, result) => {
        if (err) return res.json({ status: "ERROR" });

        if (result.length > 0) {
            return res.json({ status: "EXISTS" });
        }

        const hashedPassword = hashPassword(password);

        const insertSql = "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)";
        db.query(insertSql, [username, hashedPassword, role], (err2) => {
            if (err2) {
                console.log(err2);
                return res.json({ status: "ERROR" });
            }

            return res.json({
                status: "REGISTERED",
                hashedPassword: hashedPassword
            });
        });
    });
});

// ---------------- LOGIN ----------------
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ status: "EMPTY" });
    }

    const sql = "SELECT * FROM users WHERE username = ?";
    db.query(sql, [username], (err, result) => {
        if (err) return res.json({ status: "ERROR" });

        if (result.length === 0) {
            return res.json({ status: "USER_NOT_FOUND" });
        }

        const user = result[0];
        const now = new Date();

        // account lock check
        if (user.lock_until && new Date(user.lock_until) > now) {
            const remainingSeconds = Math.floor((new Date(user.lock_until) - now) / 1000);
            return res.json({ status: "LOCKED", remainingSeconds });
        }

        // HASH entered password before compare
        const hashedInputPassword = hashPassword(password);

        if (user.password_hash !== hashedInputPassword) {
            let attempts = (user.failed_attempts || 0) + 1;

            if (attempts >= 3) {
                const lockUntil = new Date(Date.now() + 2 * 60 * 1000); // 2 mins

                db.query(
                    "UPDATE users SET failed_attempts = ?, suspicious_status = ?, lock_until = ? WHERE username = ?",
                    [attempts, "Suspicious", lockUntil, username]
                );

                db.query(
                    "INSERT INTO login_history (username, status, role) VALUES (?, ?, ?)",
                    [username, "SUSPICIOUS", user.role]
                );

                return res.json({
                    status: "SUSPICIOUS",
                    remainingSeconds: 120
                });
            } else {
                db.query(
                    "UPDATE users SET failed_attempts = ? WHERE username = ?",
                    [attempts, username]
                );

                db.query(
                    "INSERT INTO login_history (username, status, role) VALUES (?, ?, ?)",
                    [username, "FAILED", user.role]
                );

                return res.json({
                    status: "FAILED",
                    attemptsLeft: 3 - attempts
                });
            }
        }

        // correct password
        const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();

        db.query(
            "UPDATE users SET mfa_code = ?, failed_attempts = 0, suspicious_status = ?, lock_until = NULL WHERE username = ?",
            [mfaCode, "Safe", username]
        );

        return res.json({
            status: "MFA_REQUIRED",
            code: mfaCode,
            role: user.role
        });
    });
});

// ---------------- VERIFY MFA ----------------
app.post("/verify-mfa", (req, res) => {
    const { username, code } = req.body;

    const sql = "SELECT * FROM users WHERE username = ? AND mfa_code = ?";
    db.query(sql, [username, code], (err, result) => {
        if (err) return res.json({ status: "ERROR" });

        if (result.length === 0) {
            return res.json({ status: "FAILED" });
        }

        const user = result[0];

        db.query("UPDATE users SET mfa_code = NULL WHERE username = ?", [username]);

        db.query(
            "INSERT INTO login_history (username, status, role) VALUES (?, ?, ?)",
            [username, "SUCCESS", user.role]
        );

        return res.json({
            status: "SUCCESS",
            role: user.role
        });
    });
});

// ---------------- HISTORY (ALL FOR ADMIN) ----------------
app.get("/history", (req, res) => {
    const sql = "SELECT * FROM login_history ORDER BY time DESC";
    db.query(sql, (err, result) => {
        if (err) return res.json([]);
        res.json(result);
    });
});

// ---------------- USER HISTORY (ONLY OWN) ----------------
app.get("/history/:username", (req, res) => {
    const username = req.params.username;

    const sql = "SELECT * FROM login_history WHERE username = ? ORDER BY time DESC";
    db.query(sql, [username], (err, result) => {
        if (err) return res.json([]);
        res.json(result);
    });
});

// ---------------- USERS ----------------
app.get("/users", (req, res) => {
    const sql = "SELECT * FROM users ORDER BY id DESC";
    db.query(sql, (err, result) => {
        if (err) return res.json([]);
        res.json(result);
    });
});

// ---------------- DEFAULT ROUTE ----------------
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3000");
});