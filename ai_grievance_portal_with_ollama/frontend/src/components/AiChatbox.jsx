// src/components/AiChatbox.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function AiChatbox({ token, initialMessages = [], reapplyFor = null }) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [attachments, setAttachments] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [recognizing, setRecognizing] = useState(false);
  const [error, setError] = useState("");
  const [smsStatus, setSmsStatus] = useState(null); // { smsSent: bool, smsError: string }
  const [toastVisible, setToastVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef(null);

  const API_BASE = "http://localhost:5000";

  // auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // auto-open only when `initialMessages` prop first arrives/changes
  useEffect(() => {
    if (initialMessages && initialMessages.length) setIsOpen(true);
  }, [initialMessages]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError("");
    try {
      setLoading(true);
      const body = { messages: next };
      if (reapplyFor) body.reapplyFor = reapplyFor;
      const res = await axios.post(`${API_BASE}/api/ai/chat`, body);
      const reply = res.data?.reply || "No response from AI.";
      setMessages((m) => [...next, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setError("AI service unavailable");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitTicket() {
    if (!token) return setError("Auth token missing");
    if (!messages.length) return setError("Chat is empty");
    try {
      setSubmitting(true);
      const payload = { messages };
      if (reapplyFor) payload.reapplyFor = reapplyFor;
      const res = await axios.post(
        `${API_BASE}/api/ai/analyze-and-create`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setTicket(res.data.complaint || null);
        const status = { smsSent: !!res.data.smsSent, smsError: res.data.smsError || null };
        setSmsStatus(status);
        setToastVisible(true);
        // hide toast after 6 seconds
        setTimeout(() => setToastVisible(false), 6000);
      } else {
        setError(res.data?.message || "Failed to create ticket");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to submit ticket");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating toggle */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            zIndex: 9998,
            background: "#4f9aff",
            color: "#fff",
            border: "none",
            padding: "10px 16px",
            borderRadius: 28,
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
            fontWeight: 700,
          }}
        >
          Chat
        </button>
      )}

      {/* Full-screen overlay when open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 980,
              width: "95%",
              height: "90%",
              margin: "3% auto",
              background: "#fff",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", padding: 16 }}>
              <h4 style={{ margin: 0 }}>AI Chatbot</h4>
              <div style={{ flex: 1 }} />
              <button onClick={() => setIsOpen(false)} className="btn-secondary">
                Close
              </button>
            </div>

            <p style={{ padding: "0 16px 8px 16px", margin: 0 }}>
              Describe your grievance to the assistant. After the conversation, click
              <strong> Submit Ticket</strong> to create a complaint that will appear in your dashboard.
            </p>

            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, background: "#fafafa" }}>
              {messages.length === 0 && (
                <p className="chat-placeholder">👋 Hello! Please tell me your issue, area/location and how many days you've faced it.</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "chat-bubble chat-bubble-user" : "chat-bubble"}>
                  {m.content}
                </div>
              ))}
              {loading && <p className="chat-typing">Assistant is typing…</p>}
            </div>

            {error && <p style={{ padding: "0 16px", color: "#b00020" }}>{error}</p>}

            {/* Attachments + Voice controls */}
            <div style={{ padding: '0 16px 8px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div>
                <input id="chat-files" type="file" accept="image/*,application/pdf" multiple onChange={(e)=>{
                  const files = Array.from(e.target.files || []);
                  setAttachments(files);
                  // build previews for images
                  const p = files.map(f => {
                    if (f.type.startsWith('image/')) return { url: URL.createObjectURL(f), name: f.name, type: 'image' };
                    return { url: '', name: f.name, type: 'file' };
                  });
                  setPreviews(p);
                }} />
              </div>
              <div>
                <button className={recognizing ? 'btn-secondary' : 'btn-primary'} onClick={()=>{
                  // voice-to-text using Web Speech API
                  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                  if (!SpeechRecognition) { alert('Voice recognition not supported in this browser'); return; }
                  if (!recognizing) {
                    const rec = new SpeechRecognition();
                    rec.lang = 'en-IN';
                    rec.interimResults = false;
                    rec.maxAlternatives = 1;
                    rec.onresult = (ev) => {
                      const text = Array.from(ev.results).map(r=>r[0].transcript).join(' ');
                      setInput((s)=> (s ? s + ' ' + text : text));
                    };
                    rec.onerror = (ev) => { console.error('Speech error', ev); setRecognizing(false); };
                    rec.onend = ()=> { setRecognizing(false); };
                    rec.start();
                    // store recognition instance on window to stop if needed
                    window.__ai_recognition = rec;
                    setRecognizing(true);
                  } else {
                    if (window.__ai_recognition) {
                      window.__ai_recognition.stop();
                      setRecognizing(false);
                    }
                  }
                }}>{recognizing ? 'Stop' : 'Voice'}</button>
              </div>
              {previews.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginLeft: 8, alignItems: 'center' }}>
                  {previews.map((p,i)=>(
                    <div key={i} style={{ textAlign: 'center' }}>
                      {p.type === 'image' ? <img src={p.url} alt={p.name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} /> : <div style={{ width:64,height:64,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #ddd',borderRadius:6 }}>{p.name.split('.').pop().toUpperCase()}</div>}
                      <div style={{ fontSize: 11, maxWidth: 80, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: 12, borderTop: "1px solid #eee", background: "#fff" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <textarea
                  className="chat-input"
                  rows={3}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message…"
                  style={{ flex: 1, minHeight: 48, maxHeight: 160, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button className="btn-primary" onClick={handleSend} disabled={loading || !input.trim()}>
                    Send
                  </button>
                  <button className="btn-secondary" onClick={() => setMessages(initialMessages || [])} disabled={loading || submitting}>
                    Clear
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 13, marginRight: 6 }}>Category:</label>
                  <select value={selectedCategory} onChange={(e)=>setSelectedCategory(e.target.value)} style={{ padding: '6px 8px', borderRadius: 6 }}>
                    <option value="Water">Water</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Potholes/Garbage">Potholes/Garbage</option>
                    <option value="Police">Police</option>
                    <option value="General">General / Other</option>
                  </select>
                </div>

                <div style={{ marginLeft: 'auto' }}>
                  <button className="btn-success" onClick={async ()=>{
                    if (!token) return setError('Auth token missing');
                    if (!messages.length) return setError('Chat is empty');
                    try {
                      setSubmitting(true);
                      // If files selected, send multipart/form-data
                      let res;
                      if (attachments && attachments.length > 0) {
                        const form = new FormData();
                        form.append('messages', JSON.stringify(messages));
                        form.append('category', selectedCategory);
                        if (reapplyFor) form.append('reapplyFor', reapplyFor);
                        attachments.forEach((f) => form.append('files', f));
                        res = await axios.post(`${API_BASE}/api/ai/analyze-and-create`, form, { headers: { Authorization: `Bearer ${token}` } });
                      } else {
                        const payload = { messages, category: selectedCategory };
                        if (reapplyFor) payload.reapplyFor = reapplyFor;
                        res = await axios.post(`${API_BASE}/api/ai/analyze-and-create`, payload, { headers: { Authorization: `Bearer ${token}` } });
                      }

                      if (res.data?.success) {
                        setTicket(res.data.complaint || null);
                        const status = { smsSent: !!res.data.smsSent, smsError: res.data.smsError || null };
                        setSmsStatus(status);
                        setToastVisible(true);
                        setTimeout(() => setToastVisible(false), 6000);
                        // clear selected files and revoke object URLs
                        previews.forEach(p => { if (p.url) URL.revokeObjectURL(p.url); });
                        setAttachments([]);
                        setPreviews([]);
                      } else {
                        setError(res.data?.message || 'Failed to create ticket');
                      }
                    } catch (err) {
                      console.error(err);
                      setError('Failed to submit ticket');
                    } finally {
                      setSubmitting(false);
                    }
                  }} disabled={submitting || messages.length === 0}>
                    {submitting ? 'Submitting…' : 'Submit Ticket'}
                  </button>
                </div>
              </div>
            </div>

            {ticket && (
              <div style={{ padding: 16 }}>
                <div className="ticket-preview-title">Ticket created successfully</div>
                <div><strong>Reference No:</strong> {ticket.referenceNo}</div>
                <div><strong>Category:</strong> {ticket.category}</div>
                <div><strong>Priority:</strong> {ticket.priority}</div>
                <div><strong>Status:</strong> {ticket.status}</div>
                {ticket.assignedDept && (
                  <div><strong>Assigned Dept:</strong> {ticket.assignedDept}</div>
                )}
                {ticket.assignedAdmin && ticket.assignedAdmin.name && (
                  <div style={{ marginTop: 6 }}>
                    <strong>Assigned Officer:</strong> {ticket.assignedAdmin.name} {ticket.assignedAdmin.username ? `(${ticket.assignedAdmin.username})` : ''}
                    {ticket.assignedAdmin.phone && (
                      <span style={{ marginLeft: 8 }}>— <a href={`tel:${ticket.assignedAdmin.phone}`}>{ticket.assignedAdmin.phone}</a></span>
                    )}
                  </div>
                )}
                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <strong>Attachments:</strong>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                      {ticket.attachments.map((a, idx) => (
                        <div key={idx} style={{ textAlign: 'center' }}>
                          {a.mimeType && a.mimeType.startsWith('image/') ? (
                            <a href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.filename || a.name} style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 6 }} /></a>
                          ) : (
                            <div style={{ width: 96, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', borderRadius: 6 }}>
                              <a href={a.url} target="_blank" rel="noreferrer">View {a.filename ? a.filename.split('.').pop().toUpperCase() : 'file'}</a>
                            </div>
                          )}
                          <div style={{ fontSize: 12, maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.filename || a.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {smsStatus && (
                  <div style={{ marginTop: 8 }}>
                    <strong>SMS Acknowledgement:</strong>
                    <span style={{ marginLeft: 8, color: smsStatus.smsSent ? 'green' : '#b00020' }}>
                      {smsStatus.smsSent ? 'Sent' : 'Not sent'}
                    </span>
                    {smsStatus.smsError && (
                      <div style={{ color: '#b00020', marginTop: 6 }}>{smsStatus.smsError}</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Toast */}
            {toastVisible && smsStatus && (
              <div style={{ position: 'fixed', right: 28, bottom: 120, zIndex: 10000 }}>
                <div style={{ background: '#fff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', minWidth: 260 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Ticket created</div>
                  <div style={{ fontSize: 13 }}>Ref: {ticket?.referenceNo || '—'}</div>
                  <div style={{ fontSize: 13, marginTop: 6, color: smsStatus.smsSent ? 'green' : '#b00020' }}>
                    {smsStatus.smsSent ? 'SMS acknowledgement sent' : `SMS not sent${smsStatus.smsError ? ': ' + smsStatus.smsError : ''}`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
        //appear in your dashboard.
