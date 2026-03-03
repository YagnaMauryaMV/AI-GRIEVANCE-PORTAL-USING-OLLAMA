// backend/ai/logic.js
// Simple deterministic complaint flow implemented in Node as fallback

module.exports = { processMessage };

function processMessage(message, state = {}, user = {}) {
  const text = (message || "").trim();

  if (!state || typeof state !== "object") state = {};

  // Step 1: ask category if missing
  if (!state.category) {
    const cat = detectCategory(text);
    if (!cat) {
      return { reply: "👉 What category does your issue fall under? (Water / Electricity / Road / Waste / Other)", state };
    }
    state.category = cat;
    return { reply: `Category selected: ${capitalize(cat)}. Please provide the exact location of the issue.`, state };
  }

  // Step 2: location
  if (!state.location) {
    state.location = text || "";
    return { reply: "📝 Please describe the issue briefly (2-3 sentences).", state };
  }

  // Step 3: description
  if (!state.description) {
    state.description = text || "";
    return { reply: `Please confirm:\nCategory: ${capitalize(state.category)}\nLocation: ${state.location}\nDescription: ${state.description}\nType "yes" to confirm or "no" to restart.`, state };
  }

  // Step 4: confirm
  const lower = text.toLowerCase();
  if (!state.confirmed) {
    if (lower === "yes" || lower === "y") {
      // signal to create complaint
      const complaint = {
        category: state.category,
        location: state.location,
        description: state.description,
      };
      // clear state for next conversation
      return { reply: "✅ Complaint confirmed and will be filed.", state: {}, complaint };
    }
    if (lower === "no") {
      return { reply: "🔄 Restarting complaint flow. What is the category?", state: {} };
    }
    return { reply: 'Please type "yes" to confirm or "no" to restart.', state };
  }

  return { reply: "I didn't understand that.", state };
}

// small helpers
function detectCategory(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes("water") || t.includes("tap") || t.includes("leak") || t === "1") return "water";
  if (t.includes("electric") || t.includes("power") || t.includes("current") || t === "2") return "electricity";
  if (t.includes("road") || t.includes("pothole") || t === "3") return "road";
  if (t.includes("garbage") || t.includes("waste") || t === "4") return "waste";
  if (t.includes("other") || t === "5") return "other";
  return null;
}
function capitalize(s){ return s && s[0] ? s[0].toUpperCase()+s.slice(1):s; }
