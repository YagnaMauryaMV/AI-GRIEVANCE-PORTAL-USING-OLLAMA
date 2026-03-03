const express = require("express");
const router = express.Router();
const twilio = require("twilio");

const isProd = process.env.NODE_ENV === "production";

// 🔁 Twilio client only created in PROD mode
let client = null;
if (isProd) {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

/**
 * SEND OTP
 */
router.post("/send", async (req, res) => {
  const { phone } = req.body;

  if (!phone) return res.json({ success: false, message: "Phone required" });

  if (!isProd) {
    // DEV MODE
    console.log(`🛠 DEV MODE -> OTP for ${phone}: 123456`);
    return res.json({ success: true, devOtp: 123456 });
  }

  try {
    await client.verify.v2.services(process.env.VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });

    return res.json({ success: true, message: "OTP sent via SMS" });
  } catch (err) {
    console.error("Twilio send error:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

/**
 * VERIFY OTP
 */
router.post("/verify", async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) return res.json({ success: false, message: "Phone & OTP required" });

  if (!isProd) {
    // DEV MODE
    if (otp === "123456") {
      return res.json({ success: true, message: "OTP verified (DEV MODE)" });
    }
    return res.json({ success: false, message: "Invalid OTP (DEV MODE)" });
  }

  try {
    const check = await client.verify.v2.services(process.env.VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code: otp });

    if (check.status === "approved") {
      return res.json({ success: true, message: "OTP verified" });
    }

    return res.json({ success: false, message: "Invalid OTP" });
  } catch (err) {
    console.error("Twilio verify error:", err);
    res.status(500).json({ success: false, message: "OTP verification failed" });
  }
});

module.exports = router;
