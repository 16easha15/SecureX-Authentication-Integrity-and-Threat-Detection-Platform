let isLoginMode = false;
let currentUser = localStorage.getItem("loggedInUser") || "";
let currentRole = localStorage.getItem("loggedInRole") || "";
let lockTimerInterval = null;

document.addEventListener("DOMContentLoaded", () => {
    updateDashboardUser();
    hideAdminIfNotAdmin();
    loadHistoryPage();
    loadAdminUsers();
});

// ---------------- SWITCH MODES ----------------
function switchToLogin() {
    isLoginMode = true;
    document.getElementById("title").innerText = "Login";
    document.getElementById("mainBtn").innerText = "Login";
    document.querySelector(".switch-text").innerHTML =
        `Don't have an account? <span onclick="switchToRegister()">Register</span>`;
    document.getElementById("role").parentElement.style.display = "none";
    document.getElementById("message").innerText = "";
    document.getElementById("mfaSection").classList.add("hidden");
}

function switchToRegister() {
    isLoginMode = false;
    document.getElementById("title").innerText = "Register";
    document.getElementById("mainBtn").innerText = "Register";
    document.querySelector(".switch-text").innerHTML =
        `Already have an account? <span onclick="switchToLogin()">Login</span>`;
    document.getElementById("role").parentElement.style.display = "block";
    document.getElementById("message").innerText = "";
    document.getElementById("mfaSection").classList.add("hidden");
}

// ---------------- REGISTER ----------------
function registerUser() {
    if (isLoginMode) {
        loginUser();
        return;
    }

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value;
    const message = document.getElementById("message");

    fetch("/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password, role })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "EMPTY") {
            message.innerText = "Please fill all fields.";
        } else if (data.status === "EXISTS") {
            message.innerText = "Username already exists.";
        } else if (data.status === "REGISTERED") {
            message.innerText = `Registered successfully!`;
            document.getElementById("password").value = "";
            analyzePassword();
            switchToLogin();
        } else {
            message.innerText = "Registration failed.";
        }
    })
    .catch(() => {
        message.innerText = "Server error during registration.";
    });
}

// ---------------- LOGIN ----------------
function loginUser() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const message = document.getElementById("message");

    currentUser = username;

    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "EMPTY") {
            message.innerText = "Please enter username and password.";
        } else if (data.status === "USER_NOT_FOUND") {
            message.innerText = "User not found.";
        } else if (data.status === "FAILED") {
            message.innerText = `Wrong password. Attempts left: ${data.attemptsLeft}`;
        } else if (data.status === "LOCKED") {
            startLockCountdown(data.remainingSeconds);
        } else if (data.status === "SUSPICIOUS") {
            startLockCountdown(data.remainingSeconds);
        } else if (data.status === "MFA_REQUIRED") {
            message.innerText = `MFA Code: ${data.code}`;
            document.getElementById("mfaSection").classList.remove("hidden");
            localStorage.setItem("tempUser", username);
            localStorage.setItem("tempRole", data.role);
        } else {
            message.innerText = "Login failed.";
        }
    })
    .catch(() => {
        message.innerText = "Server error during login.";
    });
}

// ---------------- LOCK COUNTDOWN ----------------
function startLockCountdown(seconds) {
    const message = document.getElementById("message");

    clearInterval(lockTimerInterval);

    let remaining = seconds;

    lockTimerInterval = setInterval(() => {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        message.innerText = `Suspicious login detected. Locked for ${mins}:${secs.toString().padStart(2, "0")}`;

        if (remaining <= 0) {
            clearInterval(lockTimerInterval);
            message.innerText = "Lock finished. You can try login again.";
        }

        remaining--;
    }, 1000);
}

// ---------------- VERIFY MFA ----------------
function verifyMFA() {
    const code = document.getElementById("mfaCode").value.trim();
    const message = document.getElementById("message");

    fetch("/verify-mfa", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: currentUser, code })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "SUCCESS") {
            localStorage.setItem("loggedInUser", currentUser);
            localStorage.setItem("loggedInRole", data.role);

            message.innerText = "Login successful! Redirecting...";

            setTimeout(() => {
                if (data.role === "Admin") {
                    window.location.href = "admin.html";
                } else {
                    window.location.href = "dashboard.html";
                }
            }, 1000);
        } else {
            message.innerText = "Invalid MFA code.";
        }
    })
    .catch(() => {
        message.innerText = "Server error during MFA verification.";
    });
}

// ---------------- PASSWORD SCORE ----------------
function analyzePassword() {
    const password = document.getElementById("password");
    if (!password) return;

    const scoreFill = document.getElementById("scoreFill");
    const scoreText = document.getElementById("scoreText");

    const value = password.value;
    let score = 0;

    if (value.length >= 6) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    const widths = ["0%", "25%", "50%", "75%", "100%"];
    const texts = ["", "Weak", "Medium", "Strong", "Very Strong"];

    scoreFill.style.width = widths[score];
    scoreText.innerText = texts[score] || "";
}

// ---------------- DASHBOARD USER ----------------
function updateDashboardUser() {
    const welcomeUser = document.getElementById("welcomeUser");
    if (welcomeUser) {
        const user = localStorage.getItem("loggedInUser") || "User";
        welcomeUser.innerText = `Welcome, ${user}`;
    }
}

// ---------------- HIDE ADMIN LINK ----------------
function hideAdminIfNotAdmin() {
    const adminLink = document.getElementById("adminLink");
    const role = localStorage.getItem("loggedInRole");

    if (adminLink && role !== "Admin") {
        adminLink.style.display = "none";
    }
}

// ---------------- HISTORY PAGE ----------------
function loadHistoryPage() {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;

    const role = localStorage.getItem("loggedInRole");
    const username = localStorage.getItem("loggedInUser");

    let url = "/history";
    if (role !== "Admin") {
        url = `/history/${username}`;
    }

    fetch(url)
        .then(res => res.json())
        .then(data => {
            historyList.innerHTML = "";

            if (!data.length) {
                historyList.innerHTML = "<li>No login history found.</li>";
                return;
            }

            data.forEach(item => {
                const li = document.createElement("li");
                li.innerText = `${item.username} | ${item.status} | ${item.role} | ${new Date(item.time).toLocaleString()}`;
                historyList.appendChild(li);
            });
        })
        .catch(() => {
            historyList.innerHTML = "<li>Unable to load login history.</li>";
        });
}

// ---------------- ADMIN USERS ----------------
function loadAdminUsers() {
    const userTableBody = document.getElementById("userTableBody");
    if (!userTableBody) return;

    fetch("/users")
        .then(res => res.json())
        .then(data => {
            userTableBody.innerHTML = "";

            if (!data.length) {
                userTableBody.innerHTML = `<tr><td colspan="7">No users found.</td></tr>`;
                return;
            }

            data.forEach(user => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td>${user.suspicious_status || "Safe"}</td>
                    <td>${user.failed_attempts || 0}</td>
                    <td>${user.lock_until ? new Date(user.lock_until).toLocaleString() : "—"}</td>
                    <td>${user.created_at ? new Date(user.created_at).toLocaleString() : "—"}</td>
                `;
                userTableBody.appendChild(row);
            });
        })
        .catch(() => {
            userTableBody.innerHTML = `<tr><td colspan="7">Unable to load users.</td></tr>`;
        });
}

// ---------------- LOGOUT ----------------
function logout() {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("loggedInRole");
    localStorage.removeItem("tempUser");
    localStorage.removeItem("tempRole");
    window.location.href = "index.html";
}

// ---------------- INTEGRITY CHECKER ----------------
async function checkIntegrity() {
    const msg1 = document.getElementById("msg1");
    const msg2 = document.getElementById("msg2");
    const result = document.getElementById("result");

    if (!msg1 || !msg2 || !result) return;

    const text1 = msg1.value.trim();
    const text2 = msg2.value.trim();

    if (!text1 || !text2) {
        result.innerHTML = "Please enter both messages.";
        return;
    }

    const hash1 = await sha256(text1);
    const hash2 = await sha256(text2);

    if (hash1 === hash2) {
        result.innerHTML = `
            <p><strong>Original Hash:</strong> ${hash1}</p>
            <p><strong>Modified Hash:</strong> ${hash2}</p>
            <p style="margin-top:10px;">✅ Integrity Maintained (No Tampering Detected)</p>
        `;
    } else {
        result.innerHTML = `
            <p><strong>Original Hash:</strong> ${hash1}</p>
            <p><strong>Modified Hash:</strong> ${hash2}</p>
            <p style="margin-top:10px;">⚠️ Integrity Violated (Tampering Detected)</p>
        `;
    }
}

// ---------------- SHA-256 ----------------
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}