import React, { useEffect, useState } from "react";
import "./DashboardPages.css";

export default function DeleteComplaint() {
  const [complaints, setComplaints] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  const token = localStorage.getItem("token");

  const loadComplaints = async () => {
    if (!token) {
      setError("Not logged in");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/complaints/my", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load complaints");
      }

      // FIXED FIELD NAME + normalize id
      const normalized = (data.complaints || [])
        .filter((c) => !c.deletedByUser)
        .map((c) => ({ ...c, id: c.id || c._id }));
      setComplaints(normalized);
    } catch (err) {
      console.error("DeleteComplaint load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const handleDelete = async (refNo) => {
    setActionMsg("");

    if (!window.confirm(`Delete complaint ${refNo}?`)) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/complaints/delete/${encodeURIComponent(refNo)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Delete failed");
      }

      setActionMsg(`Complaint ${refNo} deleted.`);
      await loadComplaints();
    } catch (err) {
      console.error("DeleteComplaint error:", err);
      setError(err.message);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!complaints.length) return <p>No complaints available to delete.</p>;

  return (
    <div className="page-container">
      <h2>Delete Complaint</h2>
      {actionMsg && <p style={{ color: "green" }}>{actionMsg}</p>}
      <table className="complaints-table">
        <thead>
          <tr>
            <th>Reference No</th>
            <th>Subject</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {complaints.map((c) => (
            <tr key={c.id}>
              <td>{c.referenceNo}</td>
              <td>{c.subject}</td>
              <td>{c.status}</td>
              <td>
                <button onClick={() => handleDelete(c.referenceNo)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
