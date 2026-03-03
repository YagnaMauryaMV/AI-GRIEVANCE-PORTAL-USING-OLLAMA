// backend/models/Otp.js
const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    channel: { type: String, default: "sms" },
    status: { type: String, default: "pending" },
    otp_sid: { type: String },      // from Twilio verify
    verify_sid: { type: String },   // from Twilio verification check
    message: { type: String },
  },
  { timestamps: true }
);

// ✅ Correct export (this makes .create() work)
module.exports = mongoose.model("OtpLog", otpSchema);
