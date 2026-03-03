// frontend/src/pages/DashboardLayout.jsx (Changes are minor, focusing on paths)

import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./DashboardLayout.css";

export default function DashboardLayout() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  if (!token) {
    localStorage.clear();
    navigate("/");
    return null;
  }

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="dash-shell">
      <aside className={`left-sidebar ${open ? "expanded" : "collapsed"}`}>
        <div className="sidebar-header">
          <button className="menu-toggle" onClick={() => setOpen(!open)}>☰</button>
          {open && <span className="portal-title">Citizen Dashboard</span>}
        </div>

        <nav className="sidebar-menu">
          {/* Use relative paths for cleaner nesting */}
          <NavLink to="/profile" end className="main-link"> {/* Absolute path for the home link */}
            🏠 <span>Overview</span>
          </NavLink>

          <NavLink to="complaints" className="main-link"> {/* FIX: Use relative path */}
            📁 <span>Complaints Raised</span>
          </NavLink>

          <NavLink to="track" className="main-link"> {/* FIX: Use relative path */}
            🔍 <span>Track Complaint Status</span>
          </NavLink>

          <NavLink to="rejected" className="main-link"> {/* FIX: Use relative path */}
            ❌ <span>Rejected Complaints</span>
          </NavLink>

          <NavLink to="delete" className="main-link"> {/* FIX: Use relative path */}
            🗑️ <span>Delete Complaint</span>
          </NavLink>

          <NavLink to="deleted" className="main-link"> {/* FIX: Use relative path */}
            ♻️ <span>Complaints Deleted</span>
          </NavLink>

        </nav>


        <button className="sidebar-logout" onClick={logout}>
          {open ? "Logout" : "⏻"}
        </button>
      </aside>

      <main className="dash-main">
        <Outlet />
      </main>
    </div>
  );
}