let isLogin = false;
let pendingUser = "";
let pendingRole = "";
let lockTimerInterval = null;

// ---------------- TOGGLE MODE ----------------
function toggleMode() {
    isLogin = !isLogin;

    const title = document.getElementById("title");
    const toggleText = document.getElementById("toggleText");
    const hashBox = document.getElementById("hashBox");
    const statusMsg = document.getElementById("statusMsg");
    const roleBox = document.getElementById("roleBox");
    const mfaBox = document.getElementById("mfaBox");

    if (isLogin) {
        if (title) title.innerText = "Login";
        if (toggleText) toggleText.innerText = "Switch to Register";
        if (roleBox) roleBox.style.display = "none";
    } else {
        if (title) title.innerText = "Register";
        if (toggleText) toggleText.innerText = "Switch to Login";
        if (roleBox) roleBox.style.display = "block";
    }

    if (hashBox) {
        hashBox.style.display = "none";
        hashBox.innerHTML = "";
    }

    if (statusMsg) statusMsg.innerText = "";
    if (mfaBox) mfaBox.style.display = "none";

    clearFields();
    stopLockTimer();
}

// ---------------- CLEAR FIELDS ----------------
function clearFields() {
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const mfaCode = document.getElementById("mfaCode");

    if (username) username.value = "";
    if (password) password.value = "";
    if (mfaCode) mfaCode.value = "";
}

// ---------------- HASH FUNCTION ----------------
async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// ---------------- PASSWORD ANALYSIS ----------------
function analyzePassword() {
    const password = document.getElementById("password")?.value || "";
    const scoreFill = document.getElementById("scoreFill");
    const scoreText = document.getElementById("scoreText");
    const breachWarning = document.getElementById("breachWarning");

    if (!scoreFill || !scoreText || !breachWarning) return;

    let score = 0;
    let commonPasswords = [
        "123456", "password", "qwerty", "12345678",
        "admin", "abc123", "111111", "123123", "admin123"
    ];

    if (password.length >= 8) score += 20;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 20;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;

    scoreFill.style.width = score + "%";

    if (score <= 40) {
        scoreText.innerText = "Low Security";
        scoreText.style.color = "#ffb3b3";
    } else if (score <= 80) {
        scoreText.innerText = "Medium Security";
        scoreText.style.color = "#ffe08a";
    } else {
        scoreText.innerText = "High Security";
        scoreText.style.color = "#d4ffd6";
    }

    if (commonPasswords.includes(password.toLowerCase())) {
        breachWarning.innerText = "⚠ Common/Breached Password Detected!";
        breachWarning.style.color = "#ffb3b3";
    } else {
        breachWarning.innerText = "✅ Password not found in common weak list";
        breachWarning.style.color = "#d4ffd6";
    }
}

// ---------------- FORMAT TIME ----------------
function formatSeconds(seconds) {
    let mins = Math.floor(seconds / 60);
    let secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// ---------------- LOCK TIMER ----------------
function startLockTimer(seconds) {
    const statusMsg = document.getElementById("statusMsg");
    stopLockTimer();

    let remaining = seconds;

    function updateTimer() {
        if (!statusMsg) return;

        if (remaining <= 0) {
            statusMsg.innerText = "✅ Lock expired. You can try logging in again.";
            statusMsg.style.color = "#d4ffd6";
            stopLockTimer();
            return;
        }

        statusMsg.innerText = `🚨 Account locked for suspicious activity. Try again in ${formatSeconds(remaining)}`;
        statusMsg.style.color = "#ffb3b3";
        remaining--;
    }

    updateTimer();
    lockTimerInterval = setInterval(updateTimer, 1000);
}

function stopLockTimer() {
    if (lockTimerInterval) {
        clearInterval(lockTimerInterval);
        lockTimerInterval = null;
    }
}

// ---------------- HANDLE AUTH ----------------
async function handleAuth() {
    const usernameField = document.getElementById("username");
    const passwordField = document.getElementById("password");
    const roleField = document.getElementById("role");
    const hashBox = document.getElementById("hashBox");
    const statusMsg = document.getElementById("statusMsg");
    const mfaBox = document.getElementById("mfaBox");
    const mfaInfo = document.getElementById("mfaInfo");

    if (!usernameField || !passwordField) return;

    let user = usernameField.value.trim();
    let pass = passwordField.value.trim();
    let role = roleField ? roleField.value : "user";

    if (user === "" || pass === "") {
        if (statusMsg) {
            statusMsg.innerText = "⚠ Please fill all fields!";
            statusMsg.style.color = "#ffe08a";
        }
        return;
    }

    let hash = await hashPassword(pass);

    if (!isLogin) {
        try {
            let res = await fetch("http://localhost:3000/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: user, password: hash, role: role })
            });

            let data = await res.json();

            if (data.status === "EXISTS") {
                statusMsg.innerText = "❌ Username already exists!";
                statusMsg.style.color = "#ffd6d6";
                hashBox.style.display = "none";
            } else if (data.status === "REGISTERED") {
                statusMsg.innerText = "✅ Registered Successfully!";
                statusMsg.style.color = "#d4ffd6";

                hashBox.style.display = "block";
                hashBox.innerHTML = `<b>Generated SHA-256 Hash:</b><br><br>${hash}`;

                setTimeout(() => {
                    toggleMode();
                }, 2000);
            } else if (data.status === "EMPTY") {
                statusMsg.innerText = "⚠ Please fill all fields!";
                statusMsg.style.color = "#ffe08a";
            } else {
                statusMsg.innerText = "❌ Registration failed!";
                statusMsg.style.color = "#ffd6d6";
            }
        } catch (error) {
            console.log("Register Error:", error);
            statusMsg.innerText = "❌ Server connection error!";
            statusMsg.style.color = "#ffd6d6";
        }
    } else {
        try {
            let res = await fetch("http://localhost:3000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: user, password: hash })
            });

            let data = await res.json();

            if (data.status === "LOCKED") {
                startLockTimer(data.remainingSeconds);
                return;
            }

            if (data.status === "MFA_REQUIRED") {
                pendingUser = user;
                pendingRole = data.role;

                statusMsg.innerText = "🔐 Password verified. MFA required.";
                statusMsg.style.color = "#fff4b8";

                if (mfaBox) mfaBox.style.display = "block";
                if (mfaInfo) {
                    mfaInfo.innerHTML = `Demo MFA Code: <b>${data.code}</b>`;
                }

                if (hashBox) {
                    hashBox.style.display = "none";
                    hashBox.innerHTML = "";
                }

                stopLockTimer();
            } else if (data.status === "FAILED") {
                statusMsg.innerText = `❌ Invalid Username or Password! Attempts left: ${data.attemptsLeft}`;
                statusMsg.style.color = "#ffd6d6";
            } else if (data.status === "SUSPICIOUS") {
                startLockTimer(data.remainingSeconds);
            } else if (data.status === "USER_NOT_FOUND") {
                statusMsg.innerText = "❌ User not found!";
                statusMsg.style.color = "#ffd6d6";
            } else {
                statusMsg.innerText = "❌ Login failed!";
                statusMsg.style.color = "#ffd6d6";
            }
        } catch (error) {
            console.log("Login Error:", error);
            statusMsg.innerText = "❌ Server connection error!";
            statusMsg.style.color = "#ffd6d6";
        }
    }
}

// ---------------- VERIFY MFA ----------------
async function verifyMFA() {
    const mfaCodeField = document.getElementById("mfaCode");
    const statusMsg = document.getElementById("statusMsg");

    if (!mfaCodeField || !statusMsg) return;

    const mfaCode = mfaCodeField.value.trim();

    if (mfaCode === "") {
        statusMsg.innerText = "⚠ Please enter MFA code!";
        statusMsg.style.color = "#ffe08a";
        return;
    }

    try {
        let res = await fetch("http://localhost:3000/verify-mfa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: pendingUser, code: mfaCode })
        });

        let data = await res.json();

        if (data.status === "SUCCESS") {
            statusMsg.innerText = "✅ MFA Verified! Login Successful.";
            statusMsg.style.color = "#d4ffd6";

            localStorage.setItem("loggedInUser", pendingUser);
            localStorage.setItem("userRole", data.role);

            setTimeout(() => {
                if (data.role === "admin") {
                    window.location.href = "admin.html";
                } else {
                    window.location.href = "dashboard.html";
                }
            }, 1200);
        } else {
            statusMsg.innerText = "❌ Invalid MFA Code!";
            statusMsg.style.color = "#ffd6d6";
        }
    } catch (error) {
        console.log("MFA Error:", error);
        statusMsg.innerText = "❌ Server connection error!";
        statusMsg.style.color = "#ffd6d6";
    }
}

// ---------------- LOAD HISTORY ----------------
async function loadHistory() {
    const list = document.getElementById("historyList");
    if (!list) return;

    try {
        let res = await fetch("http://localhost:3000/history");
        let data = await res.json();

        list.innerHTML = "";

        if (data.length === 0) {
            list.innerHTML = "<li>No login history found.</li>";
            return;
        }

        data.forEach(item => {
            let li = document.createElement("li");
            li.innerText = `${item.username} — ${item.status} — ${item.role || "user"} — ${new Date(item.time).toLocaleString()}`;
            list.appendChild(li);
        });
    } catch (error) {
        console.log(error);
        list.innerHTML = "<li>Unable to load history.</li>";
    }
}

// ---------------- LOAD USERS ----------------
async function loadUsers() {
    const table = document.getElementById("userTableBody");
    if (!table) return;

    const role = localStorage.getItem("userRole");
    if (role !== "admin") {
        alert("Access Denied! Admins only.");
        window.location.href = "dashboard.html";
        return;
    }

    try {
        let res = await fetch("http://localhost:3000/users");
        let data = await res.json();

        table.innerHTML = "";

        data.forEach(user => {
            let lockedText = user.lock_until
                ? new Date(user.lock_until).toLocaleString()
                : "Not Locked";

            let row = `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td>${user.suspicious_status}</td>
                    <td>${user.failed_attempts}</td>
                    <td>${lockedText}</td>
                    <td>${new Date(user.created_at).toLocaleString()}</td>
                </tr>
            `;
            table.innerHTML += row;
        });
    } catch (error) {
        console.log(error);
    }
}

// ---------------- LOGOUT ----------------
function logout() {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRole");
    window.location.href = "index.html";
}

// ---------------- INTEGRITY CHECKER ----------------
async function checkIntegrity() {
    const msg1 = document.getElementById("msg1");
    const msg2 = document.getElementById("msg2");
    const result = document.getElementById("result");

    if (!msg1 || !msg2 || !result) return;

    let m1 = msg1.value.trim();
    let m2 = msg2.value.trim();

    if (m1 === "" || m2 === "") {
        result.innerText = "⚠ Please enter both messages!";
        result.style.color = "#ffe08a";
        return;
    }

    let h1 = await hashPassword(m1);
    let h2 = await hashPassword(m2);

    if (h1 === h2) {
        result.innerText = "✅ Data Safe (No Tampering Detected)";
        result.style.color = "#d4ffd6";
    } else {
        result.innerText = "❌ Data Tampered (Integrity Failed)";
        result.style.color = "#ffd6d6";
    }
}

// ---------------- PAGE LOAD ----------------
window.addEventListener("DOMContentLoaded", () => {
    loadHistory();
    loadUsers();

    const role = localStorage.getItem("userRole");
    const adminLink = document.getElementById("adminLink");

    if (adminLink && role !== "admin") {
        adminLink.style.display = "none";
    }
});