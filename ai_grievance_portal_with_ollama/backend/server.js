// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config();

const app = express();
app.use(express.json());

/* --------------------------------------
   ✅ FIX: GLOBAL SECURITY & CACHE HEADERS
----------------------------------------- */
app.use((req, res, next) => {
  // 1. FIX: X-Content-Type-Options: nosniff (Security Error)
  res.setHeader("X-Content-Type-Options", "nosniff");
  // 2. Use CSP instead of X-Frame-Options
  res.setHeader("Content-Security-Policy", "frame-ancestors 'self';"); 
  
  // 3. FIX: Cache-Control for non-static files (Performance Error)
  if (!req.path.startsWith("/assets")) { // Exclude static assets if served by Express
       res.setHeader("Cache-Control", "no-store"); // simple and effective for dynamic responses
  }
  next();
});


/* --------------------------------------
   🚀 CORS CONFIG
----------------------------------------- */
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ BLOCKED ORIGIN:", origin);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-bp-secret"
    ],
  })

);

// Serve uploaded files from /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// NOTE: The separate app.options("*", ...) block is redundant after the cors middleware, 
// but is kept to ensure broad pre-flight compliance.

/* --------------------------------------
/* --------------------------------------
   SERVER STARTUP & ROUTES
----------------------------------------- */

console.log("🟢 Starting AI Grievance Portal backend...");

/* --------------------------------------
   SAFE ROUTE IMPORTER
----------------------------------------- */
function safeImportRoute(routePath) {
  try {
    const fullPath = path.resolve(__dirname, routePath);
    console.log(`🔧 Loading ${routePath} -> ${fullPath}`);
    const mod = require(fullPath);

    let candidate = mod.default || mod.router || mod;
    const isRouterLike =
      typeof candidate === "function" ||
      candidate?.handle ||
      Array.isArray(candidate?.stack);

    if (isRouterLike) {
      console.log(`✅ Loaded route: ${routePath}`);
      return candidate;
    } else {
      console.error(`❌ Invalid router export in ${routePath}`);
      return null;
    }
  } catch (err) {
    console.error(`❌ Failed to load ${routePath}:`, err.message);
    return null;
  }
}

/* --------------------------------------
   LOAD ROUTES
----------------------------------------- */
const authRouter = safeImportRoute("./routes/auth");
const adminRouter = safeImportRoute("./routes/admin");
const complaintRouter = safeImportRoute("./routes/complaints");
const aiRouter = safeImportRoute("./routes/ai");
const smsRouter = safeImportRoute("./routes/sms.js");

/* --------------------------------------
   REGISTER ROUTES
----------------------------------------- */
if (authRouter) app.use("/api/auth", authRouter);
if (adminRouter) app.use("/api/admin", adminRouter);
if (complaintRouter) app.use("/api/complaints", complaintRouter);
if (aiRouter) app.use("/api/ai", aiRouter);
if (smsRouter) app.use("/api/sms", smsRouter);

/**
 * 🟢 THIS IS THE IMPORTANT ONE
 */

/* --------------------------------------
   HEALTH CHECK
----------------------------------------- */
app.get("/api/test", (req, res) => res.json({ status: "Server is running" }));

/* --------------------------------------
   MONGODB CONNECTION
----------------------------------------- */
// ... (rest of the file remains the same)
const MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_grievance_db";

async function connectMongo() {
    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log("✅ MongoDB connected successfully");
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err.message);
    }
}
connectMongo();

/* --------------------------------------
   START SERVER
----------------------------------------- */
const BASE_PORT = parseInt(process.env.PORT, 10) || 5000;
let currentPort = BASE_PORT;
const MAX_PORT_ATTEMPTS = 5;

function startServer(attempt = 0) {
  const server = app.listen(currentPort, () =>
    console.log(`🚀 Backend is live at http://localhost:${currentPort}`)
  );

  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE" && attempt < MAX_PORT_ATTEMPTS) {
      console.warn(
        `⚠️ Port ${currentPort} in use — trying port ${currentPort + 1} (attempt ${attempt + 1})`
      );
      currentPort += 1;
      // small delay before retrying to allow other process cleanup
      setTimeout(() => startServer(attempt + 1), 200);
    } else {
      console.error("❌ Failed to start server:", err);
      // If we've exhausted attempts or got a fatal error, exit with non-zero code
      process.exit(1);
    }
  });
}

startServer();

/* --------------------------------------
   ERROR HANDLERS
----------------------------------------- */
process.on("uncaughtException", (err) =>
    console.error("💀 Uncaught Exception:", err)
);
process.on("unhandledRejection", (reason) =>
    console.error("⚠️ Unhandled Rejection:", reason)
);