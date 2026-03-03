import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AiChatbox from '../components/AiChatbox';

export default function ReapplyComplaint() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/complaints/${encodeURIComponent(ref)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data?.success) {
          // safety: only allow reapply if complaint was actually rejected
          if (data.complaint?.status !== 'Rejected') {
            alert('This complaint is not rejected and cannot be re-applied.');
            navigate('/dashboard/complaints');
            return;
          }
          setComplaint(data.complaint);
        } else {
          alert(data.message || 'Failed to load complaint');
          navigate('/dashboard/complaints');
        }
      } catch (e) {
        console.error('Load complaint failed', e);
        alert('Network error');
        navigate('/dashboard/complaints');
      } finally {
        setLoading(false);
      }
    })();
  }, [ref]);

  if (loading) return <p>Loading…</p>;
  if (!complaint) return null;

  // Prefill assistant prompt so it asks only for valid info for re-application
  const initialMessages = [
    {
      role: 'assistant',
      content: `Your previous complaint (Ref: ${complaint.referenceNo}) was rejected. Rejection reason: ${complaint.rejectedReason || 'Not provided'}. Please provide only the missing or corrected information required to re-open the complaint. I will ask focused questions; answer concisely.`,
    },
    { role: 'user', content: `I want to re-apply my complaint ${complaint.referenceNo}.` },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2>Re-apply Complaint: {complaint.referenceNo}</h2>
      {complaint.attachments && complaint.attachments.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <strong>Attachments:</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {complaint.attachments.map((a, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                {a.mimeType && a.mimeType.startsWith('image/') ? (
                  <a href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.filename || a.name} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 6 }} /></a>
                ) : (
                  <a href={a.url} target="_blank" rel="noreferrer">View {a.filename ? a.filename.split('.').pop().toUpperCase() : 'file'}</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <p>Follow the assistant prompts to provide the missing/correct information. When ready, submit to re-create the ticket.</p>
      <AiChatbox token={token} initialMessages={initialMessages} reapplyFor={complaint.referenceNo} />
    </div>
  );
}
