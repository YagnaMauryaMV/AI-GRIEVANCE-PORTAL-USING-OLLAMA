import React, { useEffect, useState } from "react";
import "./DashboardPages.css";

export default function RejectedComplaints() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not logged in");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/api/complaints/rejected",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load rejected complaints");
        }
        const normalized = (data.complaints || []).map((c) => ({ ...c, id: c.id || c._id }));
        setItems(normalized);
      } catch (err) {
        console.error("RejectedComplaints error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!items.length) return <p>No rejected complaints.</p>;

  return (
    <div className="page-container">
      <h2>Rejected Complaints</h2>
      <table className="complaints-table">
        <thead>
          <tr>
            <th>Reference No</th>
            <th>Subject</th>
            <th>Reason</th>
            <th>Last updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id || c._id}>
              <td>{c.referenceNo}</td>
              <td>{c.subject}</td>
              <td>{c.rejectionReason || c.rejectedReason || "-"}</td>
              <td>
                {c.updatedAt
                  ? new Date(c.updatedAt).toLocaleString()
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
