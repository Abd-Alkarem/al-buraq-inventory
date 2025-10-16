// client/src/routes/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth.jsx";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("demo");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    try {
      setBusy(true);
      await login(username, password);
      nav("/dashboard", { replace: true });
    } catch (err) {
      alert("Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow p-6 w-full max-w-md">
        <h1 className="text-xl font-bold mb-1">Al Buraq Inventory</h1>
        <p className="text-xs text-gray-500 mb-4">Demo login → <b>admin / demo</b></p>

        <label className="block mb-3">
          <span className="text-sm">Username</span>
          <input className="w-full border rounded-xl p-2.5"
                 value={username} onChange={e=>setUsername(e.target.value)} />
        </label>
        <label className="block mb-4">
          <span className="text-sm">Password</span>
          <input type="password" className="w-full border rounded-xl p-2.5"
                 value={password} onChange={e=>setPassword(e.target.value)} />
        </label>
        <button disabled={busy} className="w-full bg-black text-white rounded-xl py-2">
          {busy ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
