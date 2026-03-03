// routes/admin.js
const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const twilio = require('twilio');

/**
 * Basic demo admin auth (for your requirement).
 * In production replace with proper auth.
 */
async function basicAdminAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).set('WWW-Authenticate', 'Basic realm="Admin"').send('Auth required');
  try {
    const parts = auth.split(' ');
    if (parts.length !== 2) return res.status(400).send('Bad auth header');

    let scheme = parts[0];
    let creds = parts[1];
    if (scheme.toLowerCase() === 'bearer') {
      creds = parts[1];
      scheme = 'Basic';
    }

    if (scheme !== 'Basic') return res.status(400).send('Bad auth header');

    const decoded = Buffer.from(creds, 'base64').toString('utf8');
    const [user, pass] = decoded.split(':');

    if (!user || !pass) return res.status(400).send('Invalid credentials');

    // Lookup admin in DB
    const admin = await Admin.findOne({ username: user }).lean();
    if (!admin) return res.status(403).send('Forbidden');

    const match = await bcrypt.compare(pass, admin.passwordHash);
    if (!match) return res.status(403).send('Forbidden');

    // attach admin info for downstream handlers if needed
    req.admin = { username: admin.username, roles: admin.roles };
    return next();
  } catch (err) {
    console.error('basicAdminAuth error', err);
    return res.status(400).send('Error parsing auth');
  }
}

/**
 * POST /api/admin/login
 * Body: { username, password }
 * Returns: { token, admin }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: 'username & password required' });

    const admin = await Admin.findOne({ username }).lean();
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    return res.json({ token, admin: { username, roles: admin.roles } });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/complaints?onlyIndian=true
 * Returns latest complaints. If onlyIndian=true filter by +91 numbers.
 */
router.get('/complaints', basicAdminAuth, async (req, res) => {
  try {
    const onlyIndian = req.query.onlyIndian === 'true';
    const filter = {};
    if (onlyIndian) filter.phone = { $regex: /^\+91/ };

    // If admin is not super, scope complaints to their department via assignedDept
    try {
      const roles = (req.admin && req.admin.roles) || [];
      if (!roles.includes('super')) {
        const role = roles[0] || '';
        // Map role to assignedDept names used in complaints
        const roleToDept = {
          water: 'Water',
          electricity: 'Electricity',
          potholes: 'Potholes/Garbage',
          police: 'Police',
        };
        const dept = roleToDept[role.toLowerCase()];
        if (dept) filter.assignedDept = dept;
      }
    } catch (e) {
      console.warn('Admin role scoping check failed', e.message || e);
    }

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    // Build simple stats for the dashboard
    const stats = {
      total: complaints.length,
      pending: complaints.filter((c) => c.status === 'Pending').length,
      resolved: complaints.filter((c) => c.status === 'Resolved').length,
      highPriority: complaints.filter((c) => c.priority === 'High').length,
    };

    // Normalize complaints for frontend (id, referenceNo, subject, status, priority, user, phone, createdAt)
    const normalized = complaints.map((c) => ({
      id: c._id,
      referenceNo: c.referenceNo,
      subject: c.subject || c.description || '',
      category: c.category || '',
      status: c.status || '',
      priority: c.priority || '',
      user: c.name || '',
      phone: c.phone || '',
      createdAt: c.createdAt,
      assignedDept: c.assignedDept || '',
      assignedAdmin: c.assignedAdmin || {},
      attachments: (c.attachments || []).map(a => ({ filename: a.filename, url: a.url, mimeType: a.mimeType })),
      rejectedReason: c.rejectedReason || '',
      reRegisteredFrom: c.reRegisteredFrom || '',
      reApplied: !!c.reApplied,
      reAppliedAt: c.reAppliedAt || null,
    }));

    return res.json({ success: true, complaints: normalized, stats });
  } catch (err) {
    console.error('Admin complaints fetch failed:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

/**
 * POST /api/admin/complaints
 * Create a complaint as admin (store complaints raised by user)
 * Body: { name, phone, subject, description, category, priority }
 */
router.post('/complaints', basicAdminAuth, async (req, res) => {
  try {
    const { name, phone, subject, description, category, priority } = req.body || {};

    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' });

    // generate a reference number similar to other flows
    const generateRef = () => {
      return (
        'KA-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()
      );
    };

    const referenceNo = generateRef();

    const complaint = await Complaint.create({
      userId: null,
      name: name || 'Admin Created',
      phone,
      subject: subject || description || 'Created by admin',
      description: description || subject || '',
      category: category || 'General',
      priority: priority || 'Medium',
      referenceNo,
      status: 'Pending',
      source: 'manual',
    });

    return res.status(201).json({ success: true, complaint });
  } catch (err) {
    console.error('Admin create complaint error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Optional: Update complaint status
 * PUT /api/admin/complaints/:id/status { status: "in-progress"|"closed" }
 */
router.put('/complaints/:id/status', basicAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    // Accept a few synonyms and map to the schema enum values
    // Complaint.schema.status enum: ["Pending", "Resolved", "Rejected"]
    const statusMap = {
      open: 'Pending',
      'in-progress': 'Pending',
      pending: 'Pending',
      closed: 'Resolved',
      resolved: 'Resolved',
      reject: 'Rejected',
      rejected: 'Rejected',
    };

    if (!status || typeof status !== 'string') {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const normalized = statusMap[status.toLowerCase()];
    if (!normalized) return res.status(400).json({ ok: false, error: 'Invalid status value' });

    // Prepare update payload
    const updatePayload = { status: normalized };
    if (normalized === 'Rejected' && req.body.rejectedReason) {
      updatePayload.rejectedReason = req.body.rejectedReason;
    }

    // runValidators ensures enum is enforced on update
    // Verify admin has access to modify this complaint
    const complaintDoc = await Complaint.findById(id);
    if (!complaintDoc) return res.status(404).json({ ok: false, error: 'Not found' });
    const roles = (req.admin && req.admin.roles) || [];
    if (!roles.includes('super')) {
      const role = roles[0] || '';
      const cat = (complaintDoc.assignedDept || complaintDoc.category || '').toLowerCase();
      let allowed = false;
      switch (role.toLowerCase()) {
        case 'water':
          allowed = cat.includes('water');
          break;
        case 'electricity':
          allowed = cat.includes('electric');
          break;
        case 'potholes':
          allowed = cat.includes('pothole') || cat.includes('garbage');
          break;
        case 'police':
          allowed = cat.includes('police') || cat.includes('security');
          break;
        default:
          allowed = cat.includes(role.toLowerCase());
      }
      if (!allowed) return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    const c = await Complaint.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true });
    if (!c) return res.status(404).json({ ok: false, error: 'Not found' });

    // If complaint moved to Rejected or Resolved, attempt to notify the user via SMS (if configured)
    let smsSent = false;
    let smsError = null;
    if (normalized === 'Rejected' || normalized === 'Resolved') {
      // initialize twilio client if possible
      let twilioClient = null;
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        try {
          twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        } catch (e) {
          console.warn('Twilio init failed:', e.message || e);
          twilioClient = null;
        }
      }

      const phone = c.phone;
      const ref = c.referenceNo;
      const reason = c.rejectedReason || req.body.rejectedReason || '';
      // include assigned admin contact info if available
      let contactInfo = '';
      if (c.assignedAdmin && c.assignedAdmin.phone) {
        contactInfo = ` Contact ${c.assignedAdmin.name} ${c.assignedAdmin.phone} for queries.`;
      }
      let smsBody = '';
      if (normalized === 'Rejected') {
        smsBody = `Your complaint ${ref} has been rejected. Reason: ${reason}.${contactInfo}`;
      } else if (normalized === 'Resolved') {
        smsBody = `Your complaint ${ref} has been resolved. Thank you for reporting this issue.${contactInfo}`;
      }

      async function trySendSms(retries = 1) {
        if (!twilioClient || !process.env.TWILIO_FROM) {
          console.log('DEV SMS ->', phone, smsBody);
          return { sent: false, error: 'dev_mode_no_twilio' };
        }
        try {
          await twilioClient.messages.create({ to: phone, from: process.env.TWILIO_FROM, body: smsBody });
          return { sent: true };
        } catch (e) {
          if (retries > 0) return trySendSms(retries - 1);
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
      }
    }

    return res.json({ ok: true, complaint: c, smsSent, smsError });
  } catch (err) {
    console.error('Admin update status error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

module.exports = router;

