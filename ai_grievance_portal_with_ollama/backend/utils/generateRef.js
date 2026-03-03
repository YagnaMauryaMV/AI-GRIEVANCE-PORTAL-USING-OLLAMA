// backend/utils/generateRef.js
module.exports = function generateRef(prefix = "MC") {
  // e.g. MC-20251124-6c3a9 (date + random)
  const dt = new Date().toISOString().slice(0,10).replace(/-/g,"");
  const rand = Math.random().toString(36).slice(2,8).toUpperCase();
  return `${prefix}-${dt}-${rand}`;
}
