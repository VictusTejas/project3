document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "http://localhost:3000";

    // Get Elements
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const showSignup = document.getElementById("show-signup");
    const showLogin = document.getElementById("show-login");
    const logoutButton = document.getElementById("logout-button");

    // Switch Between Login & Signup Forms
    showSignup.addEventListener("click", (e) => {
        e.preventDefault();
        loginForm.classList.add("hidden");
        signupForm.classList.remove("hidden");
    });

    showLogin.addEventListener("click", (e) => {
        e.preventDefault();
        signupForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
    });

    // ✅ Signup
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("signup-name").value.trim();
        const email = document.getElementById("signup-email").value.trim();
        const password = document.getElementById("signup-password").value;
        const confirmPassword = document.getElementById("signup-confirm-password").value;

        if (password !== confirmPassword) {
            alert("❌ Passwords do not match!");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            alert("✅ Signup successful! Please login.");
            document.getElementById("show-login").click();
        } catch (error) {
            alert(`❌ Signup Error: ${error.message}`);
        }
    });

    // ✅ Login
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            alert("✅ Login successful!");
            sessionStorage.setItem("authToken", data.token);

            window.location.href = "dashboard.html";
        } catch (error) {
            alert(`❌ Login Error: ${error.message}`);
        }
    });

    // ✅ Logout
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            const token = sessionStorage.getItem("authToken");

            try {
                await fetch(`${API_BASE_URL}/logout`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                });

                sessionStorage.removeItem("authToken");
                alert("✅ Logged out successfully!");
                window.location.href = "index.html";
            } catch (error) {
                alert("❌ Logout failed!");
            }
        });
    }
});
