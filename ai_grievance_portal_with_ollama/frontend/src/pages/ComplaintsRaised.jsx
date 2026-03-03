import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';

export default function ComplaintsRaised() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedRef, setCopiedRef] = useState("");

  function copyRef(ref) {                          // 👈 NEW
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(""), 2000);
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not logged in");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch("http://localhost:5000/api/complaints/my", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const text = await res.text();
        if (!res.ok) {
          throw new Error(text || `HTTP ${res.status}`);
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            "Server returned HTML instead of JSON. Check /api/complaints/me."
          );
        }

        if (!data.success) {
          throw new Error(data.message);
        }

        // exclude user-deleted complaints here if your backend flags them
        const normalized = (data.complaints || [])
          .filter((c) => !c.deleted)
          .map((c) => ({ ...c, id: c.id || c._id }));
        setComplaints(normalized);
      } catch (err) {
        console.error("ComplaintsRaised error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Loading complaints…</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  if (!complaints.length) {
    return <p>No complaints found.</p>;
  }

  return (
    <div>
      <h2>Complaints Raised</h2>
      <table className="complaints-table">
        <thead>
          <tr>
            <th>Reference No</th>
            <th>Subject</th>
            <th>Attachments</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((c) => (
            <tr key={c.id || c._id}>
              <td>{c.referenceNo}</td>
              <td>
                <div>{c.subject} {c.reRegisteredFrom ? <span style={{ fontStyle: 'italic', marginLeft: 8 }}>(Re-applied)</span> : null}</div>
                  {c.status === 'Rejected' && (
                    <div style={{ marginTop: 8 }}>
                      <Link className="button" to={`/dashboard/reapply/${encodeURIComponent(c.referenceNo)}`}>Edit Complaint</Link>
                    </div>
                  )}
              </td>
              <td style={{ verticalAlign: 'top' }}>
                {c.attachments && c.attachments.length > 0 ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {c.attachments.map((a, idx) => (
                      <div key={idx} style={{ textAlign: 'center' }}>
                        {a.mimeType && a.mimeType.startsWith('image/') ? (
                          <a href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.filename || a.name} style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 6 }} /></a>
                        ) : (
                          <div style={{ width: 72, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', borderRadius: 6 }}>
                            <a href={a.url} target="_blank" rel="noreferrer">{a.filename ? a.filename.split('.').pop().toUpperCase() : 'FILE'}</a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#777', fontSize: 13 }}>—</span>
                )}
              </td>
              <td>
                {c.status}
                {c.status === 'Rejected' && (c.rejectedReason) && (
                  <span style={{ marginLeft: 8, color: '#666', fontStyle: 'italic' }}>({c.rejectedReason})</span>
                )}
              </td>
              <td>
                {c.createdAt
                  ? new Date(c.createdAt).toLocaleString()
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
