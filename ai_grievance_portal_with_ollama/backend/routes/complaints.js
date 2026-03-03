// backend/routes/complaints.js
const express = require("express");
const jwt = require("jsonwebtoken");
const Complaint = require("../models/Complaint");

const router = express.Router();

/** JWT AUTH */
function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, message: "Token missing" });

    req.user = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

/** Generate Reference Number */
function generateRef() {
  return (
    "KA-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

/** (1) CREATE A COMPLAINT */
router.post("/", auth, async (req, res) => {
  try {
    const { category, subject, description, priority } = req.body;
    if (!subject || !description)
      return res.json({ success: false, message: "Subject & description required" });

    const ref = generateRef();

    const c = await Complaint.create({
      userId: req.user.id,
      phone: req.user.phone,
      name: req.user.name,
      category: category || "General",
      subject,
      description,
      priority,
      referenceNo: ref,
      status: "Pending",
    });

    res.json({ success: true, complaint: c });
  } catch (err) {
    console.log("Create error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/** Fetch MY COMPLAINTS */
router.get("/my", auth, async (req, res) => {
  try {
    const list = await Complaint.find({
      phone: req.user.phone,
      deleted: false
    }).sort({ createdAt: -1 });

    res.json({ success: true, complaints: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/** Fetch DELETED complaints */
router.get("/deleted", auth, async (req, res) => {
  try {
    const list = await Complaint.find({
      phone: req.user.phone,
      deleted: true
    }).sort({ deletedAt: -1 });

    res.json({ success: true, complaints: list }); // <-- IMPORTANT
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/** Fetch REJECTED complaints */
router.get("/rejected", auth, async (req, res) => {
  try {
    const list = await Complaint.find({
      phone: req.user.phone,
      status: "Rejected" // <-- FIXED
    }).sort({ updatedAt: -1 });

    res.json({ success: true, complaints: list });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});


/** (6) RE-REGISTER A DELETED COMPLAINT → NEW TICKET */
router.post("/reregister/:ref", auth, async (req, res) => {
  try {
    const old = await Complaint.findOne({ referenceNo: req.params.ref });

    if (!old) return res.json({ success: false, message: "Original complaint not found" });
    if (old.phone !== req.user.phone)
      return res.json({ success: false, message: "Not allowed" });

    const newRef = generateRef();

    await Complaint.create({
      phone: old.phone,
      name: old.name,
      subject: old.subject,
      category: old.category,
      description: old.description,
      referenceNo: newRef,
      status: "Pending",
      reRegisteredFrom: req.params.ref,
    });

    res.json({ success: true, newReferenceNo: newRef });
  } catch (err) {
    console.log("Re-reg error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/** (7) TRACK COMPLAINT BY REFERENCE */
router.get("/:ref", auth, async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      referenceNo: req.params.ref.trim().toUpperCase(),
      deleted: false
    });

    if (!complaint) {
      return res.json({
        success: false,
        message: "No complaint found with this reference number",
      });
    }

    res.json({ success: true, complaint });
  } catch (err) {
    console.log("Track complaint error:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching status"
    });
  }
});


module.exports = router;
