// backend/models/User.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: { type: String, default: "Anonymous" },
  phone: { type: String, index: true, sparse: true },
  email: { type: String, default: null },
  address: { type: String, default: null },
  complaints: [{ type: Schema.Types.ObjectId, ref: "Complaint" }],
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
