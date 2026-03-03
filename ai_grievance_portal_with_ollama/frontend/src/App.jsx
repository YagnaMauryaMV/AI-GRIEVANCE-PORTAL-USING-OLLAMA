// src/App.jsx
import { LangProvider, LangContext } from "./context/LangContext";
import React, { useState } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";

import LoginPage from "./components/LoginPage";
import ProfilePage from "./components/ProfilePage";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";

// 🔹 NEW IMPORTS FOR DASHBOARD
import DashboardLayout from "./pages/DashboardLayout";
import ComplaintsRaised from "./pages/ComplaintsRaised";
import TrackStatus from "./pages/TrackStatus";
import RejectedComplaints from "./pages/RejectedComplaints";
import DeleteComplaint from "./pages/DeleteComplaint";
import DeletedComplaints from "./pages/DeletedComplaints";

// Protected route
const ProtectedRoute = ({ element, token, redirectPath = "/" }) => {
  return token ? element : <Navigate to={redirectPath} replace />;
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });

  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");

  const handleLangChange = (e) => {
    const selected = e.target.value;
    setLang(selected);
    localStorage.setItem("lang", selected);
  };

  const translations = {
    en: {
      title: "Karnataka Grievance Portal",
      citizenLogin: "Citizen Login",
      fullName: "Full Name",
      phone: "Phone (+91...)",
      enterCaptcha: "Enter Captcha",
      requestOtp: "Request OTP",
      adminLogin: "Admin Login",
      logout: "Logout",
      welcome: "Welcome",
      tickets: "Your Tickets",
      noTickets: "No complaints found",
      otpVerification: "OTP Verification",
      otpSentSuccessfully: "OTP sent successfully",
      enterOtp: "Enter OTP",
      verifyOtp: "Verify OTP",
      back: "Back",
    },
    kn: {
      title: "ಕರ್ನಾಟಕ ದೂರು ಪೋರ್ಟಲ್",
      citizenLogin: "ನಾಗರಿಕ ಲಾಗಿನ್",
      fullName: "ಪೂರ್ಣ ಹೆಸರು",
      phone: "ಫೋನ್ (+91...)",
      enterCaptcha: "ಕ್ಯಾಪ್ಚಾ ನಮೂದಿಸಿ",
      requestOtp: "OTP ವಿನಂತಿಸಿ",
      adminLogin: "ನಿರ್ವಾಹಕ ಲಾಗಿನ್",
      logout: "ಲಾಗ್ ಔಟ್",
      welcome: "ಸ್ವಾಗತ",
      tickets: "ನಿಮ್ಮ ದೂರುಗಳು",
      noTickets: "ಯಾವುದೇ ದೂರುಗಳಿಲ್ಲ",
      otpVerification: "OTP ಪರಿಶೀಲನೆ",
      otpSentSuccessfully: "OTP ಯಶಸ್ವಿಯಾಗಿ ಕಳುಹಿಸಲಾಗಿದೆ",
      enterOtp: "OTP ನಮೂದಿಸಿ",
      verifyOtp: "OTP ಪರಿಶೀಲಿಸಿ",
      back: "ಹಿಂದೆ",
    },
  };

  const t = translations[lang];

  return (
    <LangProvider>
      <LangContext.Provider value={{ lang, setLang, t, handleLangChange }}>
        <Routes>
          {/* LOGIN */}
          <Route
            path="/"
            element={
              <LoginPage
                onLogin={(tkn, usr) => {
                  localStorage.setItem("token", tkn);
                  localStorage.setItem("user", JSON.stringify(usr));
                  setToken(tkn);
                  setUser(usr);
                  navigate("/profile");
                }}
                onAdmin={() => navigate("/admin")}
              />
            }
          />

          {/* 🟦 PROFILE + DASHBOARD (NESTED) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute
                token={token}
                element={<DashboardLayout />}
              />
            }
          >
            {/* index = Overview = ProfilePage card */}
            <Route
              index
              element={
                <ProfilePage
                  token={token}
                  user={user}
                  onLogout={() => {
                    localStorage.clear();
                    setToken(null);
                    setUser(null);
                    navigate("/");
                  }}
                />
              }
            />

            <Route path="complaints" element={<ComplaintsRaised />} />
            <Route path="track" element={<TrackStatus />} />
            <Route path="rejected" element={<RejectedComplaints />} />
            <Route path="delete" element={<DeleteComplaint />} />
            <Route path="deleted" element={<DeletedComplaints />} />
          </Route>

          {/* ADMIN ROUTES */}
          <Route
            path="/admin"
            element={
              <AdminLogin
                onBack={() => navigate("/")}
                onSuccess={(admin, token) => {
                  localStorage.setItem("admin", JSON.stringify(admin));
                  localStorage.setItem("adminToken", token);
                  navigate("/admin-dashboard");
                }}
              />
            }
          />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute
                token={localStorage.getItem("admin")}
                redirectPath="/admin"
                element={
                  <AdminDashboard
                    admin={JSON.parse(localStorage.getItem("admin"))}
                    onLogout={() => {
                      localStorage.removeItem("admin");
                      localStorage.removeItem("adminToken");
                      navigate("/");
                    }}
                  />
                }
              />
            }
          />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LangContext.Provider>
    </LangProvider>
  );
}
