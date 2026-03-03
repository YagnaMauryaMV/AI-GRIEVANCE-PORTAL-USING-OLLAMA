// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const crypto = require("crypto");
const svgCaptcha = require("svg-captcha");
const twilio = require("twilio");
const jwt = require("jsonwebtoken");

// Models
const User = require("../models/User");
const OtpLog = require("../models/OtpLog");

// ---- ENV & TWILIO SETUP ----
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID,
  JWT_SECRET,
  NODE_ENV,
} = process.env;

const isDev = NODE_ENV !== "production";

// Only create Twilio client if we actually intend to use it
let client = null;
if (!isDev && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}
const DEV_OTP = "123456";


// -------------------- CAPTCHA GENERATION --------------------
router.get("/captcha", (req, res) => {
  // CORS (if needed)
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");

  try {
    const captcha = svgCaptcha.create({
      size: 6,
      noise: 3,
      color: true,
      background: "#f9f9f9",
      width: 150,
      height: 60,
      ignoreChars: "0Oo1Il",
    });

    res.json({
      id: crypto.randomBytes(8).toString("hex"),
      svg: captcha.data,
      text: captcha.text,
    });
  } catch (err) {
    console.error("❌ Error generating captcha:", err.message);
    res.status(500).json({ message: "Captcha generation failed" });
  }
});

// -------------------- START LOGIN --------------------
router.post("/start-login", async (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: "Name and phone required" });
  }

  try {
    // Find or create user
    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ name, phone });
    }

    // 🔧 DEV MODE OR NO TWILIO CONFIG -> BYPASS TWILIO
    if (isDev || !client || !TWILIO_VERIFY_SERVICE_SID) {
      console.log("🛠 DEV MODE / NO TWILIO -> OTP BYPASS ACTIVE");

      // Optional logging
      if (OtpLog) {
        await OtpLog.create({
          phone,
          channel: "sms",
          status: "dev-bypass",
          message: `DEV OTP generated: ${DEV_OTP}`,
        }).catch((e) =>
          console.error("Failed to log dev OTP:", e.message)
        );
      }

      return res.json({
        success: true,
        showOtp: true,
        phone,
        devOtp: DEV_OTP,
        message: "DEV: OTP bypass active. Use 123456.",
      });
    }

    // ✅ PRODUCTION: Send OTP via Twilio Verify
    const verification = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });

    // Log OTP send
    if (OtpLog) {
      await OtpLog.create({
        phone,
        channel: "sms",
        status: verification.status || "sent",
        otp_sid: verification.sid,
        message: "OTP sent successfully",
      }).catch((e) =>
        console.error("Failed to log OTP attempt:", e.message)
      );
    }

    return res.json({
      success: true,
      message: "OTP sent successfully",
      showOtp: true,
      phone,
    });
  } catch (err) {
    console.error(
      "❌ Error in start-login:",
      err.message,
      "code:",
      err.code,
      "status:",
      err.status
    );

    // Log failure
    if (OtpLog) {
      await OtpLog.create({
        phone: req.body.phone || "unknown",
        channel: "sms",
        status: "failed",
        message: err.message,
      }).catch((e) =>
        console.error("Failed to log error:", e.message)
      );
    }

    // 🔴 SPECIFIC HANDLING FOR TWILIO RATE LIMIT
    if (
      err.status === 429 || // HTTP 429
      err.code === 20429 || // common Twilio rate limit code
      /too many requests/i.test(err.message)
    ) {
      return res.status(429).json({
        success: false,
        message:
          "Too many OTP requests. Please wait a minute before trying again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error processing your request",
      error: isDev ? err.message : undefined,
    });
  }
});

// -------------------- VERIFY OTP --------------------
router.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      message: "Phone number and OTP are required",
    });
  }

  try {
    // 🔧 DEV MODE / NO TWILIO: CHECK AGAINST DEV_OTP LOCALLY
    if (isDev || !client || !TWILIO_VERIFY_SERVICE_SID) {
      console.log(`🛠 DEV VERIFY for ${phone} with OTP ${otp}`);

      if (otp !== DEV_OTP) {
        if (OtpLog) {
          await OtpLog.create({
            phone,
            channel: "sms",
            status: "failed",
            message: `DEV OTP verification failed. Got ${otp}`,
          }).catch((e) =>
            console.error("Failed to log dev verify fail:", e.message)
          );
        }

        return res.status(400).json({
          success: false,
          message: "Invalid OTP (DEV MODE). Use 123456.",
        });
      }

      // DEV success flow
      if (OtpLog) {
        await OtpLog.create({
          phone,
          channel: "sms",
          status: "verified",
          message: "DEV OTP verified successfully",
        }).catch((e) =>
          console.error("Failed to log dev verify success:", e.message)
        );
      }

      let user = await User.findOne({ phone });
      if (!user) {
        user = await User.create({ phone, name: `User-${phone}` });
      }

      const token = jwt.sign(
        { id: user._id, phone: user.phone, name: user.name },
        JWT_SECRET || "dev_secret",
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "OTP verified successfully (DEV MODE)",
        token,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
        },
      });
    }

    // ✅ PRODUCTION: USE TWILIO VERIFY SERVICE
    console.log(`🔍 Verifying OTP for ${phone}...`);

    const check = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: phone,
        code: otp,
      });

    console.log(`📊 Twilio verification status: ${check.status}`);

    if (check.status === "approved") {
      if (OtpLog) {
        await OtpLog.create({
          phone,
          channel: "sms",
          status: "verified",
          verify_sid: check.sid,
          message: "OTP verified successfully",
        }).catch((e) =>
          console.error(
            "Failed to log OTP verification success:",
            e.message
          )
        );
      }

      let user = await User.findOne({ phone });
      if (!user) {
        user = await User.create({ phone, name: `User-${phone}` });
      }

      const token = jwt.sign(
        { id: user._id, phone: user.phone, name: user.name },
        JWT_SECRET || "dev_secret",
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "OTP verified successfully",
        token,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
        },
      });
    } else {
      if (OtpLog) {
        await OtpLog.create({
          phone,
          channel: "sms",
          status: "failed",
          message: `OTP verification failed: ${check.status}`,
        }).catch((e) =>
          console.error(
            "Failed to log OTP verification failure:",
            e.message
          )
        );
      }

      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
        status: check.status,
      });
    }
  } catch (err) {
    console.error("❌ Error verifying OTP:", err.message);

    if (OtpLog) {
      await OtpLog.create({
        phone,
        channel: "sms",
        status: "error",
        message: `Verification error: ${err.message}`,
      }).catch((e) =>
        console.error("Failed to log verification error:", e.message)
      );
    }

    let errorMessage = "Error verifying OTP";
    if (err.code === 20404) {
      errorMessage =
        "Verification service not found. Please check your Twilio configuration.";
    } else if (err.code === 60200) {
      errorMessage = "Invalid OTP. Please try again.";
    } else if (err.code === 60203) {
      errorMessage = "Too many attempts. Please try again later.";
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: isDev ? err.message : undefined,
    });
  }
});

module.exports = router;
