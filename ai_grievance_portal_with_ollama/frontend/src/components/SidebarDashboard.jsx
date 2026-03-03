import React from "react";
import { NavLink } from "react-router-dom";
import "./Dashboard.css";

export default function SidebarDashboard({ onLogout }) {
  return (
    <nav className="dash-sidebar">
      <div className="brand">Karnataka Grievance</div>

      <ul>
        <li><NavLink to="/dashboard/overview">Overview</NavLink></li>
        <li><NavLink to="/dashboard/complaints">Complaints raised</NavLink></li>
        <li><NavLink to="/dashboard/track">Track complaint status</NavLink></li>
        <li><NavLink to="/dashboard/help">Help</NavLink></li>
        <li><NavLink to="/dashboard/settings">Settings</NavLink></li>
        <li><NavLink to="/dashboard/edit-profile">Edit profile</NavLink></li>
      </ul>

      <div className="dash-footer">
        <button className="btn-logout" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}
