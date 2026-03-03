import React, { useState, useEffect } from "react";
import { useLang } from "../context/LangContext";

export default function AdminDashboard({ admin, onLogout }) {
  const { t } = useLang();
  const [stats, setStats] = useState({});
  const [complaints, setComplaints] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newComplaint, setNewComplaint] = useState({ name: '', phone: '', subject: '', category: '', priority: 'Medium' });
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

 useEffect(() => {
  const token = localStorage.getItem("admin-token");
  fetch("http://localhost:5000/api/admin/complaints", {
    headers: { Authorization: token },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        // normalize IDs so UI comparisons are consistent
        const normalized = (data.complaints || []).map((c) => ({ ...c, id: c.id || c._id }));
        setComplaints(normalized);
        setStats(data.stats);
      } else {
        console.error("Failed to load complaints:", data.message);
      }
    })
    .catch((err) => console.error("Network error:", err));
}, []);

async function refreshComplaints() {
  const token = localStorage.getItem('admin-token');
  try {
    const res = await fetch('http://localhost:5000/api/admin/complaints', { headers: { Authorization: token } });
    const data = await res.json();
    if (data.success) {
      const normalized = (data.complaints || []).map((c) => ({ ...c, id: c.id || c._id }));
      setComplaints(normalized);
      setStats(data.stats);
    }
  } catch (e) {
    console.error('Failed to refresh complaints', e);
  }
}

async function confirmReject() {
  if (!rejectTarget) return;
  const token = localStorage.getItem('admin-token');
  try {
    const res = await fetch(`http://localhost:5000/api/admin/complaints/${rejectTarget}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ status: 'rejected', rejectedReason: rejectReason }),
    });
    const data = await res.json();
      if (res.ok && data.ok) {
        // update complaint status and rejectedReason from server response
        const updatedId = data.complaint?.id || data.complaint?._id || rejectTarget;
        setComplaints((prev) => prev.map((x) => (String(x.id) === String(updatedId) || String(x.id) === String(rejectTarget) ? { ...x, status: data.complaint.status, rejectedReason: data.complaint.rejectedReason || '' } : x)));
        setStats((s) => ({ ...s, pending: Math.max(0, (s.pending || 0) - 1) }));
        setRejectReason('');
        setRejectTarget(null);
        setRejectModalVisible(false);
        if (data.smsSent === false) {
          // sms not sent (dev mode or failed)
          if (data.smsError) alert('Rejected — SMS failed: ' + data.smsError);
        }
      } else {
        alert(data.error || data.message || 'Failed to update status');
      }
  } catch (err) {
    console.error('Reject failed', err);
    alert('Network error');
  }
}

async function handleCreate(e) {
  e.preventDefault();
  const token = localStorage.getItem('admin-token');
  try {
    const res = await fetch('http://localhost:5000/api/admin/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(newComplaint),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      // add to top of list and refresh stats
      setComplaints((s) => [
        {
          id: data.complaint.id || data.complaint._id,
          referenceNo: data.complaint.referenceNo,
          subject: data.complaint.subject,
          category: data.complaint.category,
          status: data.complaint.status,
          priority: data.complaint.priority,
          user: data.complaint.name,
          phone: data.complaint.phone,
          createdAt: data.complaint.createdAt,
        },
        ...s,
      ]);
      setShowCreate(false);
      setNewComplaint({ name: '', phone: '', subject: '', category: '', priority: 'Medium' });
      // refresh stats properly
      refreshComplaints();
    } else {
      alert(data.message || 'Failed to create complaint');
    }
  } catch (err) {
    console.error('Create complaint failed', err);
    alert('Network error');
  }
}


  return (
    <div className="profile-card admin-card" style={{ maxWidth: 1100, margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Welcome, {admin?.username}</h2>
        <button className="button" onClick={onLogout}>
          Logout
        </button>
      </div>

      <div
        className="stats"
        style={{ display: "flex", gap: 20, marginTop: 20, flexWrap: "wrap" }}
      >
        <div className="stat-box">Total: {stats.total}</div>
        <div className="stat-box">Pending: {stats.pending}</div>
        <div className="stat-box">Resolved: {stats.resolved}</div>
        <div className="stat-box">High Priority: {stats.highPriority}</div>
      </div>

      <h3 style={{ marginTop: 30 }}>Recent Complaints</h3>
      <div style={{ marginTop: 10 }}>
        <button className="button" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'Add Complaint'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ marginTop: 12, padding: 12, border: '1px solid #ddd' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="input" placeholder="Name" value={newComplaint.name} onChange={(e)=>setNewComplaint({...newComplaint, name: e.target.value})} />
            <input className="input" placeholder="Phone" value={newComplaint.phone} onChange={(e)=>setNewComplaint({...newComplaint, phone: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="input" placeholder="Subject" value={newComplaint.subject} onChange={(e)=>setNewComplaint({...newComplaint, subject: e.target.value})} />
            <input className="input" placeholder="Category" value={newComplaint.category} onChange={(e)=>setNewComplaint({...newComplaint, category: e.target.value})} />
            <select value={newComplaint.priority} onChange={(e)=>setNewComplaint({...newComplaint, priority: e.target.value})}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button" type="submit">Create</button>
            <button className="button" type="button" onClick={()=>setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Reject confirmation modal (simple inline modal) */}
      {rejectModalVisible && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 20, maxWidth: 600, width: '90%', borderRadius: 6 }}>
            <h3>Confirm Rejection</h3>
            <p>Provide a reason to notify the citizen about the rejection:</p>
            <textarea value={rejectReason} onChange={(e)=>setRejectReason(e.target.value)} rows={4} style={{ width: '100%' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
              <button className="button" onClick={()=>{ setRejectModalVisible(false); setRejectTarget(null); setRejectReason(''); }}>Cancel</button>
              <button className="button" onClick={confirmReject}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
      <table className="complaints-table" style={{ marginTop: 10 }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th>Reference</th>
            <th>Subject</th>
            <th>Category</th>
            <th>Status</th>
            <th>Priority</th>
            <th>User</th>
            <th>Phone</th>
            <th>Created</th>
            <th>Attachments</th>
            <th>Actions & Note</th>
          </tr>
        </thead>
        <tbody>
          {complaints.length === 0 ? (
            <tr>
              <td colSpan="10" style={{ textAlign: "center", padding: 10 }}>
                No complaints found
              </td>
            </tr>
          ) : (
            complaints.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: 8 }}>{c.referenceNo}</td>
                <td style={{ padding: 8 }}>{c.subject}</td>
                <td style={{ padding: 8 }}>{c.category}</td>
                <td style={{ padding: 8 }}>
                  {c.status}
                  {c.status === 'Rejected' && (c.rejectedReason || c.statusMessage) && (
                    <span style={{ marginLeft: 8, color: '#666', fontStyle: 'italic' }}>({c.rejectedReason || c.statusMessage})</span>
                  )}
                </td>
                <td style={{ padding: 8 }}>{c.priority}</td>
                <td style={{ padding: 8 }}>{c.user}</td>
                <td style={{ padding: 8 }}>{c.phone}</td>
                <td style={{ padding: 8 }}>{new Date(c.createdAt).toLocaleString()}</td>
                <td style={{ padding: 8, verticalAlign: 'top' }}>
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
                <td style={{ padding: 8, whiteSpace: 'nowrap', verticalAlign: 'top', minWidth: 220 }}>
                  {/* Show actions only for Pending complaints; hide for Resolved/Rejected */}
                  {c.status === 'Pending' && (
                    <>
                      <button
                        className="button"
                        style={{ marginRight: 6 }}
                        onClick={async () => {
                          const token = localStorage.getItem('admin-token');
                          try {
                            const res = await fetch(`http://localhost:5000/api/admin/complaints/${c.id}/status`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', Authorization: token },
                              body: JSON.stringify({ status: 'resolved' }),
                            });
                            const data = await res.json();
                            if (res.ok && data.ok) {
                              const updatedId = data.complaint.id || data.complaint._id || c.id;
                              setComplaints((prev) => prev.map((x) => (String(x.id) === String(c.id) ? { ...x, status: data.complaint.status } : x)));
                              setStats((s) => ({ ...s, pending: Math.max(0, (s.pending || 0) - 1), resolved: (s.resolved || 0) + 1 }));
                              if (data.smsSent === false) {
                                if (data.smsError) alert('Resolution SMS failed: ' + data.smsError);
                              }
                            // set inline resolved message
                            setComplaints((prev) => prev.map((x) => (String(x.id) === String(updatedId) ? { ...x, statusMessage: 'The issue is resolved' } : x)));
                            } else {
                              alert(data.error || data.message || 'Failed to update status');
                            }
                          } catch (err) {
                            console.error('Status update failed', err);
                            alert('Network error');
                          }
                        }}
                      >
                        Mark Resolved
                      </button>

                      <button
                        className="button"
                        onClick={() => {
                          setRejectTarget(c.id);
                          setRejectReason('');
                          setRejectModalVisible(true);
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {/* Inline note / status message (displayed in same Actions column). Show without 'reason' text or brackets. */}
                  {c.statusMessage && (
                    <div className="inline-note">{c.statusMessage}</div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
