// src/components/Dashboard.jsx
import React from "react";
import { useLang } from "../context/LangContext";

export default function Dashboard() {
  const { t } = useLang();
  return (
    <div style={{ maxWidth: 1100, margin: "18px auto" }}>
      <div className="card" style={{ padding: 20 }}>
        <h3>{t("yourDashboard","Your Dashboard")}</h3>
        <p style={{ color: "#666" }}>This is the dashboard main view. Add charts, stats and ticket lists here.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 12 }}>
          <div className="card" style={{ padding: 12 }}>Open Tickets: 0</div>
          <div className="card" style={{ padding: 12 }}>Resolved: 0</div>
          <div className="card" style={{ padding: 12 }}>Pending: 0</div>
        </div>
      </div>
    </div>
  );
}
