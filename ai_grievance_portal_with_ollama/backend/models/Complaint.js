// backend/models/Complaint.js
const mongoose = require("mongoose");

const ComplaintSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: String,
    phone: { type: String, required: true },
    subject: String,
    description: String,
    category: String,
    /** Standardized status values */
    status: {
      type: String,
      enum: ["Pending", "Resolved", "Rejected"],
      default: "Pending",
    },

    /** Reason provided by admin when rejected */
    rejectedReason: { type: String, default: "" },

    source: { type: String, enum: ["ai", "manual"], default: "ai" },
    deleted: { type: Boolean, default: false },

    /** When user deletes complaint */
    deletedAt: { type: Date, default: null },

    /** Store old status before deletion */
    previousStatus: { type: String, default: "" },

    /** Old reference for re-registration */
    reRegisteredFrom: { type: String, default: "" },
    /** Mark if this complaint was re-applied after rejection */
    reApplied: { type: Boolean, default: false },
    reAppliedAt: { type: Date, default: null },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    /** Complaint reference number */
    referenceNo: { type: String, unique: true, required: true },
    /** Department assignment and admin contact info */
    assignedDept: { type: String, default: '' },
    assignedAdmin: {
      username: { type: String, default: '' },
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    attachments: [
      {
        filename: String,
        url: String,
        mimeType: String,
      },
    ],

  
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", ComplaintSchema);
