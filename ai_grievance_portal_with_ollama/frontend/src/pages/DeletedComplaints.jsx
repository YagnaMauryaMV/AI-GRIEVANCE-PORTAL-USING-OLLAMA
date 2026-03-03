import React, { useEffect, useState } from "react";
import "./DashboardPages.css";


export default function DeletedComplaints() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  const loadDeleted = async () => {
    if (!token) {
      setError("Not logged in");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        "http://localhost:5000/api/complaints/deleted",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load deleted complaints");
      }
      const normalized = (data.complaints || []).map((c) => ({ ...c, id: c.id || c._id }));
      setItems(normalized);
    } catch (err) {
      console.error("DeletedComplaints error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeleted();
  }, []);

  const handleReregister = async (refNo) => {
    setMsg("");
    try {
      const res = await fetch(
        `http://localhost:5000/api/complaints/reregister/${encodeURIComponent(
          refNo
        )}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Re-register failed");
      }

      setMsg(
        `Complaint ${refNo} re-registered with new reference ${data.newReferenceNo}.`
      );

      await loadDeleted();
    } catch (err) {
      console.error("DeletedComplaints reregister error:", err);
      setError(err.message);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!items.length) return <p>No deleted complaints.</p>;

  return (
    <div className="page-container"> 
      <h2>Complaints Deleted</h2>
      {msg && <p style={{ color: "green" }}>{msg}</p>}

      <table className="complaints-table">
        <thead>
          <tr>
            <th>Reference No</th>
            <th>Subject</th>
            <th>Status before delete</th>
            <th>Deleted on</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td>{c.referenceNo}</td>
              <td>{c.subject}</td>
              <td>{c.previousStatus}</td>
              <td>
                {c.deletedAt ? new Date(c.deletedAt).toLocaleString() : "-"}
              </td>
              <td>
                <button onClick={() => handleReregister(c.referenceNo)}>
                  Re-register
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
