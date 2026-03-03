import React, { useState, useEffect, useRef } from "react";
import { useLang } from "../context/LangContext";
import "./LoginPage.css";
import emblem from "../assets/karnataka-emblem.png";

export default function LoginPage({ onLogin, onAdmin }) {
  const { lang, t, handleLangChange } = useLang();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [step, setStep] = useState("form");

  const [devOtp, setDevOtp] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");

  const otpInputRef = useRef(null);

  useEffect(() => {
    fetchCaptcha();
  }, []);

  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => otpInputRef.current?.focus(), 50);
    }
  }, [step]);

  async function fetchCaptcha() {
    try {
      const res = await fetch("http://localhost:5000/api/auth/captcha", {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json();
      setCaptchaSvg(res.ok ? data.svg : "<p>ERR</p>");
    } catch {
      setCaptchaSvg("<p>ERR</p>");
    }
  }

  async function handleRequestOtp() {
    if (!name || !phone || !captcha) {
      setMessage("Please fill all fields including captcha");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/start-login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Error");
        return;
      }

      setDevOtp(data.devOtp || "");
      setStep("otp");
    } catch {
      setMessage("Network error");
    }
  }

  async function handleVerifyOtp() {
    if (!otp) {
      setMessage("Enter OTP");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Invalid OTP");
        return;
      }

      onLogin(data.token, data.user);
    } catch {
      setMessage("Server error");
    }
  }

  return (
    <div className="login-wrapper">
      {/* Language Selector */}
      <div className="login-lang">
        <label>Language: </label>
        <select value={lang} onChange={handleLangChange}>
          <option value="en">English</option>
          <option value="kn">ಕನ್ನಡ</option>
        </select>
      </div>

      <div className="login-container">
        {/* Logo + Portal Title */}
        <div className="login-header">
          <img src={emblem} className="login-logo" alt="Karnataka Emblem" />

          {/* 🔵 ADDED TITLE HERE */}
          <h2 className="login-portal-title">Karnataka Grievance Portal</h2>
        </div>

        {/* Main Login Card */}
        <div className="login-card">
          {step === "form" && (
            <>
              <h2 className="form-title">{t.citizenLogin}</h2>

              <input
                className="input"
                placeholder={t.fullName}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                className="input"
                placeholder={t.phone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <div className="captcha-row">
                <input
                  className="input"
                  placeholder={t.enterCaptcha}
                  value={captcha}
                  onChange={(e) => setCaptcha(e.target.value)}
                />

                <div
                  className="captcha-box"
                  dangerouslySetInnerHTML={{ __html: captchaSvg }}
                />

                <button className="refresh-btn" onClick={fetchCaptcha}>
                  ↻
                </button>
              </div>

              <button className="btn-primary" onClick={handleRequestOtp}>
                {t.requestOtp}
              </button>

              <button className="btn-secondary" onClick={onAdmin}>
                {t.adminLogin}
              </button>

              {message && <div className="message">{message}</div>}
            </>
          )}

          {step === "otp" && (
            <div className="otp-section">
              <div className="otp-success">✅ {t.otpSentSuccessfully}</div>

              <h2 className="otp-title">{t.otpVerification}</h2>

              {devOtp && (
                <p className="dev-otp">
                  (Dev OTP: <strong>{devOtp}</strong>)
                </p>
              )}

              <input
                ref={otpInputRef}
                className="otp-input"
                placeholder={t.enterOtp}
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />

              <div className="otp-actions">
                <button className="btn-primary" onClick={handleVerifyOtp}>
                  {t.verifyOtp}
                </button>

                <button
                  className="btn-primary btn-wide btn-backmatch"
                  onClick={() => {
                    setStep("form");
                    fetchCaptcha();
                  }}
                >
                  {t.back}
                </button>
              </div>

              {message && <div className="message">{message}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
