import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App";
import DashboardLayout from "./pages/DashboardLayout";
import Overview from "./pages/Overview";
import ComplaintsRaised from "./pages/ComplaintsRaised";
import TrackStatus from "./pages/TrackStatus";
import DeletedComplaints from "./pages/DeletedComplaints";
import RejectedComplaints from "./pages/RejectedComplaints";
import DeleteComplaint from "./pages/DeleteComplaint";
import ReapplyComplaint from "./pages/ReapplyComplaint";



import "./styles.css";

function Root() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home + App (login + profile flows are handled by App's internal routes) */}
        <Route path="/*" element={<App />} />

        {/* Dashboard (separate layout with nested routes) */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="overview" element={<Overview />} />
          <Route path="complaints" element={<ComplaintsRaised />} />
          <Route path="track" element={<TrackStatus />} />
          <Route path="deletecomplaints" element={<DeleteComplaint />} />
          <Route path="rejectedcomplaints" element={<RejectedComplaints />} />
          <Route path="reapply/:ref" element={<ReapplyComplaint />} />
          <Route path="deletedcomplaints" element={<DeletedComplaints />} />
        </Route>

        {/* Optional: a catch-all that redirects to home (uncomment if desired) */}
        {/*
        <Route path="*" element={<Navigate to="/" replace />} />
        */}
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);