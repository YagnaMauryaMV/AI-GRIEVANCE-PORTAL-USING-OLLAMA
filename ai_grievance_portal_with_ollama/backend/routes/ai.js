// backend/routes/ai.js
// AI integration using external Python FastAPI service (Ollama LLaMA 3.2)

const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const twilio = require("twilio");
const Complaint = require("../models/Complaint");
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // keep original extension
    const safeName = file.originalname.replace(/[^a-zA-Z0-9\.\-\_]/g, '_');
    cb(null, `${suffix}-${safeName}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

const router = express.Router();

// Base URL for the Python FastAPI backend from ai-grievance-system
// Example: http://127.0.0.1:8000
const PY_API_BASE = process.env.PY_AI_BASE || "http://127.0.0.1:8000";

// Twilio client (optional) - only active if credentials present
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (e) {
    console.warn("Twilio client init failed:", e.message);
    twilioClient = null;
  }
}

/** Simple JWT auth (same logic as complaints.js) */
function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Token missing" });

    req.user = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    next();
  } catch (err) {
    console.error("JWT error:", err.message);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
}

/** Generate Reference Number (same pattern as complaints.js) */
function generateRef() {
  return (
    "KA-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

/** Map AI severity_level to our priority field */
function mapSeverityToPriority(severity) {
  if (!severity) return "Medium";
  const s = String(severity).toLowerCase();
  if (s === "low") return "Low";
  if (s === "high" || s === "critical") return "High";
  return "Medium";
}

/**
 * POST /api/ai/chat
 * Body: { messages: [{ role: "user" | "assistant", content: string }, ...] }
 * Returns: { success, reply }
 *
 * This simply forwards the conversation to the Python `/ai/chat-simple` endpoint.
 */
router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.json({
        success: false,
        message: "messages[] is required",
      });
    }

    const response = await axios.post(`${PY_API_BASE}/ai/chat-simple`, {
      messages,
    });

    return res.json({
      success: true,
      reply: response.data.reply,
    });
  } catch (err) {
    console.error("AI /chat error:", err.message);
    return res.status(500).json({
      success: false,
      message: "AI chat service error",
    });
  }
});

/**
 * POST /api/ai/analyze-and-create
 * Auth required (citizen logged in).
 *
 * Body: { messages: [{ role, content }, ...] }
 *
 * Flow:
 *  1. Forwards the full conversation to Python `/ai/analyze`.
 *  2. Python returns structured grievance JSON.
 *  3. We create a Complaint in MongoDB using that data.
 *  4. Return the created complaint object.
 */
router.post("/analyze-and-create", upload.array('files'), async (req, res) => {
  try {
    // messages may come in as JSON string when multipart/form-data is used
    let messages = req.body.messages;
    if (typeof messages === 'string') {
      try { messages = JSON.parse(messages); } catch (e) { /* leave as string */ }
    }

    // handle uploaded files: build attachments array
    const attachments = (req.files || []).map(f => ({ filename: f.originalname, url: `${req.protocol}://${req.get('host')}/uploads/${f.filename}`, mimeType: f.mimetype }));

    // Attempt to verify JWT if provided in Authorization header.
    // If verification succeeds, populate `req.user`. If no token provided,
    // fall back to dev-mode user when not in production (see below).
    try {
      const header = req.headers.authorization || req.headers.Authorization;
      if (header && header.split && header.split(" ").length === 2) {
        const token = header.split(" ")[1];
        if (token) {
          req.user = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
        }
      }
    } catch (jwtErr) {
      console.warn("JWT verification failed:", jwtErr.message);
      req.user = null;
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.json({
        success: false,
        message: "messages[] is required",
      });
    }

    // If auth middleware rejected (no token) but we're in development mode,
    // allow a dev-mode submission by using phone/name from the request body.
    // This makes it easy to test `analyze-and-create` without a frontend login.
    if (!req.user) {
      if (process.env.NODE_ENV === "production") {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      // Dev fallback: allow caller to provide phone/name and a fake user id
      const devPhone = req.body.phone || req.body.user?.phone || "0000000000";
      const devName = req.body.name || req.body.user?.name || "Dev User";
      console.warn("Dev mode: no JWT provided to /api/ai/analyze-and-create — using fallback user data.");
      req.user = { id: "dev-user", phone: devPhone, name: devName };
    }

    // Department admin contact mapping
    const departmentConfig = {
      'Water': { deptKey: 'Water', admin: { username: 'water@gok', name: 'Surya', phone: '+917894561230' } },
      'Electricity': { deptKey: 'Electricity', admin: { username: 'electricity@gok', name: 'Chandra', phone: '+917894561230' } },
      'Potholes/Garbage': { deptKey: 'Potholes/Garbage', admin: { username: 'potholes@gok', name: 'Kumar', phone: '+917894561230' } },
      'Police': { deptKey: 'Police', admin: { username: 'police@gok', name: 'Narayana', phone: '+917894561230' } },
      'General': { deptKey: 'General', admin: { username: 'admin@gok', name: 'Admin', phone: '' } },
    };

    // Step 1: Let Python AI extract structured grievance info
    let info = {};
    try {
      const aiResponse = await axios.post(`${PY_API_BASE}/ai/analyze`, {
        messages,
      });
      info = aiResponse.data || {};
    } catch (aiErr) {
      // If AI fails, log and fallback to minimal extraction from user messages
      console.error("AI analyze call failed:", aiErr.stack || aiErr.message);
      // leave info empty so we can fallback to message extraction below
      info = { _ai_error: aiErr.message || String(aiErr) };
    }

    // Helper: extract likely issue text from the conversation messages
    function extractIssueFromMessages(msgs) {
      if (!Array.isArray(msgs)) return '';
      // Filter user messages
      const userMsgs = msgs.filter((m) => m.role === 'user' && m.content && String(m.content).trim().length > 0).map(m => String(m.content).trim());
      if (userMsgs.length === 0) return '';

      // Prefer the longest message (likely contains the issue description)
      let longest = userMsgs.reduce((a, b) => (a.length >= b.length ? a : b), '');

      // If the longest is very short (<30) try to pick first non-question message
      if (longest.length < 30) {
        for (const m of userMsgs) {
          const low = m.toLowerCase().trim();
          if (low.startsWith('hi') || low.startsWith('hello') || low.startsWith('thanks') || low.startsWith('thank')) continue;
          if (low.endsWith('?') && m.split(' ').length < 6) continue; // short question
          if (m.length >= 20) { longest = m; break; }
        }
      }

      // As a last resort, take the first user message
      if (!longest || longest.length === 0) longest = userMsgs[0];
      return longest;
    }

    // category priority: explicit category from frontend selection > ai-extracted > General
    const rawCategory = (req.body && req.body.category) ? String(req.body.category).trim() : (info.category || 'General');
    // normalize to one of our departmentConfig keys
    function normalizeCategory(cat) {
      if (!cat) return 'General';
      const low = String(cat).toLowerCase();
      if (low.includes('water')) return 'Water';
      if (low.includes('electric')) return 'Electricity';
      if (low.includes('pothole') || low.includes('garbage')) return 'Potholes/Garbage';
      if (low.includes('police') || low.includes('security')) return 'Police';
      return 'General';
    }
    const category = normalizeCategory(rawCategory);
    const severity = info.severity_level || 'normal';
    const priority = mapSeverityToPriority(severity);
    const ref = generateRef();

    // Determine the subject/description reliably:
    // Prefer an explicit AI-returned `issue_text` if available, then `summary`,
    // otherwise fall back to extracted issue text (longest relevant user message).
    const extractedIssue = extractIssueFromMessages(messages);
    const issueText = (info.issue_text && String(info.issue_text).trim().length > 0)
      ? String(info.issue_text).trim()
      : (info.summary && String(info.summary).trim().length > 0)
        ? String(info.summary).trim()
        : extractedIssue;
    const summary = issueText || 'Citizen grievance (summary missing from AI response)';

    // Step 2: Create complaint in MongoDB
    // Ensure userId is a valid ObjectId for mongoose. If not (dev-mode), set null.
    const userId = mongoose.Types.ObjectId.isValid(req.user?.id)
      ? req.user.id
      : null;

    const phoneToUse = req.user?.phone || req.body.phone || '0000000000';
    const nameToUse = req.user?.name || req.body.name || 'Anonymous';

    // determine assigned admin contact
    const deptCfg = departmentConfig[category] || departmentConfig['General'];
    const complaint = await Complaint.create({
      userId: userId,
      phone: phoneToUse,
      name: nameToUse,
      category,
      assignedDept: deptCfg.deptKey,
      assignedAdmin: {
        username: deptCfg.admin.username,
        name: deptCfg.admin.name,
        phone: deptCfg.admin.phone,
      },
      attachments,
      subject: summary,
      description: issueText || summary,
      priority,
      referenceNo: ref,
      status: 'Pending',
      source: 'ai',
    });

    // If this is a re-application (reapplyFor provided), link to original complaint
    if (req.body && req.body.reapplyFor) {
      try {
        const orig = await Complaint.findOne({ referenceNo: String(req.body.reapplyFor).trim() });
        if (orig && String(orig.phone) === String(phoneToUse)) {
          // mark original as re-applied and note timestamp
          orig.reApplied = true;
          orig.reAppliedAt = new Date();
          await orig.save();

          // mark new complaint with reference to original
          complaint.reRegisteredFrom = orig.referenceNo || String(req.body.reapplyFor).trim();
          await complaint.save();
        }
      } catch (e) {
        console.warn('Reapply linking failed:', e && e.message ? e.message : e);
      }
    }

    // Step 3: send SMS acknowledgement (if Twilio configured)
    // include assigned admin contact in acknowledgement
    let contactInfo = '';
    if (complaint.assignedAdmin && complaint.assignedAdmin.phone) {
      contactInfo = ` Assigned Dept: ${complaint.assignedDept}. Contact: ${complaint.assignedAdmin.name} ${complaint.assignedAdmin.phone}.`;
    }
    const smsBody = `Your complaint has been received. Reference: ${ref}.${contactInfo} We'll update you on status.`;
    let smsSent = false;
    let smsError = null;

    // Helper to attempt sending with an optional retry
    async function trySendSms(retries = 1) {
      if (!twilioClient || !process.env.TWILIO_FROM) {
        console.log("DEV SMS ->", complaint.phone, smsBody);
        return { sent: false, error: "dev_mode_no_twilio" };
      }

      try {
        await twilioClient.messages.create({
          to: complaint.phone,
          from: process.env.TWILIO_FROM,
          body: smsBody,
        });
        return { sent: true };
      } catch (e) {
        if (retries > 0) {
          console.warn("SMS send failed, retrying once:", e.message || e);
          return trySendSms(retries - 1);
        }
        return { sent: false, error: e.message || String(e) };
      }
    }

    try {
      const result = await trySendSms(1);
      smsSent = !!result.sent;
      smsError = result.error || null;
    } catch (e) {
      smsSent = false;
      smsError = e.message || String(e);
      console.error("Unexpected SMS error:", smsError);
    }

    return res.json({
      success: true,
      complaint,
      aiMeta: info,
      smsSent,
      smsError,
    });
  } catch (err) {
    console.error("AI analyze-and-create error:", err.stack || err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create complaint from AI",
    });
  }
});

module.exports = router;
