// frontend/src/components/AdminLogin.jsx
import React, { useState } from "react";
import { useLang } from "../context/LangContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";


export default function AdminLogin({ onSuccess, onBack }) {
  const { t } = useLang();
  const [username, setUsername] = useState("admin@gok");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      // ✅ Store token and redirect
      localStorage.setItem("admin-token", data.token);
      localStorage.setItem("admin", JSON.stringify(data.admin));
      if (onSuccess) {
  onSuccess(data.admin, data.token); // pass both admin & token
}

    } catch (err) {
      console.error("Admin login failed:", err);
      setMessage("Network error. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="card"
      style={{
        textAlign: "center",
        maxWidth: 500,
        margin: "auto",
        padding: "30px 20px",
      }}
    >
      <h2>Admin Login</h2>

      {/* Username Input */}
      <div className="form-row">
        <input
          className="input"
          placeholder="Admin Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      {/* Password Input + Eye Toggle */}
      <div className="form-row" style={{ position: "relative" }}>
        <input
          className="input"
          placeholder="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ paddingRight: "40px" }}
        />

        {/* 👁️ Eye Button */}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
          }}
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? "👁️" : "👁️‍🗨️"}
        </button>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        <button
          className="button"
          onClick={handleLogin}
          disabled={loading}
          style={{ minWidth: 100 }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        <button className="button" onClick={onBack}>
          Back
        </button>
      </div>

      {/* Message */}
      <div style={{ marginTop: 10, color: "red" }}>
        {message || "Default: admin@gok / Admin@1234"}
      </div>
    </div>
  );
}
