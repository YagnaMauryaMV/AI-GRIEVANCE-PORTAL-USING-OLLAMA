// src/components/ProfilePage.jsx
import React, { useEffect, useState } from "react";
import { useLang } from "../context/LangContext";
import emblem from "../assets/karnataka-emblem.png";

import ComplaintsRaised from "../pages/ComplaintsRaised";
import TrackStatus from "../pages/TrackStatus";
import RejectedComplaints from "../pages/RejectedComplaints";
import DeleteComplaint from "../pages/DeleteComplaint";
import DeletedComplaints from "../pages/DeletedComplaints";

import "../pages/DashboardLayout.css";
import AiChatbox from "./AiChatbox";
import "../styles.css";

export default function ProfilePage({ token, user, onLogout }) {
  const { t } = useLang();

  const initialUser =
    user || JSON.parse(localStorage.getItem("user") || "{}");
  const [usr] = useState(initialUser);

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [entryOpen, setEntryOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const tkn = token || localStorage.getItem("token");
    if (!tkn) {
      setLoading(false);
      return;
    }

    fetch("http://localhost:5000/api/complaints/my", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tkn}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const normalized = (data.complaints || []).map((c) => ({ ...c, id: c.id || c._id }));
          setComplaints(normalized);
        }
      })
      .catch((err) => console.error("Profile complaints error:", err))
      .finally(() => setLoading(false));
  }, [token]);

  const latest = complaints[0];

  const openTab = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(true);
  };

  return (
    <div className="profile-bg">

      {/* Header */}
      <div className="profile-header-center">
        <img
          src={emblem}
          className="profile-header-logo"
          alt="Karnataka Emblem"
        />
        <h1 className="portal-title">{t.title}</h1>
      </div>

      {/* 🟢 DASHBOARD SHELL STARTS HERE */}
      <div className="dash-shell">

        

        {/* 🟢 MAIN AREA CHANGES WITH TABS */}
        <main className="dash-main">

          {activeTab === "overview" && (
            <div className="profile-card">
              <div className="profile-info">
                <div>
                  <h2 className="profile-name">
                    {t.welcome},{" "}
                    <span className="profile-user">{usr.name}</span>
                  </h2>
                  <p className="profile-phone">{usr.phone}</p>

                  {latest && (
                    <p className="profile-last-ref">
                      Last reference:&nbsp;
                      <strong>{latest.referenceNo}</strong> ({latest.status})
                    </p>
                  )}
                </div>
              </div>

              <div className="seperator-line"></div>

              <div className="profile-sections">
                <section className="tickets">
                  <h4 className="section-title">{t.tickets}</h4>
                  {loading ? (
                    <p>Loading…</p>
                  ) : complaints.length === 0 ? (
                    <p className="section-empty">{t.noTickets}</p>
                  ) : (
                    <ul className="profile-complaints-list">
                      {complaints.slice(0, 3).map((c) => (
                        <li key={c.id || c._id}>
                          <strong>{c.referenceNo}</strong> – {c.subject} (
                          {c.status})
                        </li>
                      ))}
                    </ul>
                  )}
                <aside className="chat-box">
                  <AiChatbox token={token} />
                </aside>
              </section>

              {/* Contact Support placed below tickets for clearer ordering */}
              <section className="support" style={{ width: '65%', margin: '18px auto 0' }}>
                <h4 className="section-title">Contact Support</h4>
                <div className="support-card">
                  <div className="support-item">
                    <div className="support-dept">Water, Sewage & Irrigation Management</div>
                    <div className="support-name">Surya</div>
                    <div className="support-contact"><a href="tel:+917894561230">+91 7894561230</a></div>
                    <div className="support-addr">2nd floor, Kendriya Sadan, Koramangala, Bengaluru-34</div>
                  </div>

                  <div className="support-item">
                    <div className="support-dept">Energy Maintenance Department</div>
                    <div className="support-name">Chandra</div>
                    <div className="support-contact"><a href="tel:+917894561230">+91 7894561230</a></div>
                    <div className="support-addr">Office No:10, 2nd floor, Vikasa Soudha, Bengaluru-34</div>
                  </div>

                  <div className="support-item">
                    <div className="support-dept">Water & Irrigation Department</div>
                    <div className="support-name">Kumar</div>
                    <div className="support-contact"><a href="tel:+917894561230">+91 7894561230</a></div>
                    <div className="support-addr">Office No:3, 5th floor, Kendriya Sadan, Koramangala, Bengaluru-34</div>
                  </div>

                  <div className="support-item">
                    <div className="support-dept">Greater Bengaluru Authority</div>
                    <div className="support-name">Narayana</div>
                    <div className="support-contact"><a href="tel:+917894561230">+91 7894561230</a></div>
                    <div className="support-addr">2nd floor, Kendriya Sadan, Koramangala, Bengaluru-34</div>
                  </div>
                </div>
              </section>
              </div>
            </div>
          )}

          {activeTab === "complaints" && <ComplaintsRaised />}
          {activeTab === "track" && <TrackStatus />}

          {activeTab === "settings" && (
            <div className="profile-card">
              <h2>Settings</h2>
              <p>Settings to be added</p>
            </div>
          )}
        </main>
      </div>


    </div>
  );
}