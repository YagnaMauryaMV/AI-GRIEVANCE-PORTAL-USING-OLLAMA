const mongoose = require('mongoose');
const otpLogSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  channel: { type: String, default: "sms" },
  status: { type: String, default: "pending" },
  otp_sid: { type: String },
  verify_sid: { type: String },
  message: { type: String }
}, { timestamps: true });
module.exports = mongoose.model('OtpLog', otpLogSchema);