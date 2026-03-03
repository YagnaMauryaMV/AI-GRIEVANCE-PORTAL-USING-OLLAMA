import React, { useState } from "react";

export default function TrackStatus() {
  const [ref, setRef] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyRef(ref) {                      // 👈 NEW
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not logged in");
      return;
    }

    if (!ref.trim()) {
      setError("Please enter a reference number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/complaints/${encodeURIComponent(
          ref.trim()
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || `HTTP ${res.status}`);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Server returned HTML instead of JSON. Check /api/complaints/:ref."
        );
      }

      if (!data.success) {
        throw new Error(data.message || "Not found");
      }

      setResult(data.complaint);
    } catch (err) {
      console.error("TrackStatus error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Track complaint status</h2>
      <form onSubmit={handleSubmit} className="track-form">
        <input
          className="track-input"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="Enter reference number"
        />
        <button className="track-btn" type="submit" disabled={loading}>
          {loading ? "Checking..." : "Track"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {result && (
        <div className="track-result">
          <h3>Complaint details</h3>
          <table className="complaints-table">
            <tbody>
              <tr>
                <th>Reference No</th>
                <td>{result.referenceNo}</td>
              </tr>
              <tr>
                <th>Subject</th>
                <td>{result.subject}</td>
              </tr>
              {result.attachments && result.attachments.length > 0 && (
                <tr>
                  <th>Attachments</th>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {result.attachments.map((a, idx) => (
                        <div key={idx} style={{ textAlign: 'center' }}>
                          {a.mimeType && a.mimeType.startsWith('image/') ? (
                            <a href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.filename || a.name} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 6 }} /></a>
                          ) : (
                            <a href={a.url} target="_blank" rel="noreferrer">View {a.filename ? a.filename.split('.').pop().toUpperCase() : 'file'}</a>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              <tr>
                <th>Status</th>
                <td>{result.status}</td>
              </tr>
              <tr>
                <th>Rejection reason</th>
                <td>{result.rejectedReason || "-"}</td>
              </tr>
              <tr>
                <th>Last updated</th>
                <td>
                  {result.updatedAt
                    ? new Date(result.updatedAt).toLocaleString()
                    : "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
