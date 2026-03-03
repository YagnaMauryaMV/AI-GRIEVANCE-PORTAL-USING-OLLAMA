import React, { useState } from "react";

export default function EditProfile({ user, onUpdate }) {
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");

  async function save(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone })
      });

      const data = await res.json();
      if (data.success) {
        onUpdate && onUpdate(data.user);
        alert("Saved");
      } else {
        alert(data.error || "Could not save");
      }
    } catch (err) {
      console.error(err);
      alert("Could not save");
    }
  }

  return (
    <div>
      <h2>Edit profile</h2>
      <form onSubmit={save}>
        <label>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} />

        <label>Phone</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} />

        <button>Save</button>
      </form>
    </div>
  );
}
