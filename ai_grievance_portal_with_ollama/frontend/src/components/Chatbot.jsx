axios.post(
    "http://localhost:5000/api/ai/chat",
    {
        session_id: user.phone,
        message: userMessage,
        user_id: user.id || user._id,
        user_profile: {
            phone: user.phone,
            name: user.name,
            language: language
        }
    },
    {
        headers: {
            "Content-Type": "application/json"
        }
    }
)
.then(res => {
    addMessage("ai", res.data.reply);
})
.catch(err => {
    addMessage("ai", "⚠️ AI server unavailable");
});
