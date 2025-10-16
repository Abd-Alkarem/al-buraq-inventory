// client/src/routes/OwnerAdmins.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useAuth, API } from "../state/auth.jsx";

function formatInTZ(utcStr, tz) {
  // utcStr like "2025-10-16 04:49:50" -> interpret as UTC
  if (!utcStr) return "";
  const d = new Date(utcStr.replace(" ", "T") + "Z");
  // Show yyyy-mm-dd HH:mm:ss
  return new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).format(d);
}

const COMMON_TZS = [
  "UTC",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Africa/Cairo",
  "Asia/Karachi",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
];

export default function OwnerAdmins(){
  const { token } = useAuth();
  const [rows,setRows] = useState([]);
  const [logins,setLogins] = useState([]);
  const [err,setErr] = useState("");

  const [u,setU] = useState("");  // username
  const [p,setP] = useState("");  // password
  const [name,setName] = useState("");

  // timezone
  const browserTZ = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const [tz, setTz] = useState(browserTZ);

  // activity panel
  const [showAct, setShowAct] = useState(false);
  const [actUser, setActUser] = useState(null);
  const [actRows, setActRows] = useState([]);

  async function refresh(){
    try{
      setErr("");
      setRows(await API.ownerListUsers(token));
      setLogins(await API.ownerLogins(token));
    }catch(e){ setErr(String(e?.message||e)); }
  }
  useEffect(()=>{ refresh(); }, [token]);

  async function addUser(){
    try{
      const r = await API.ownerCreateUser(token, { username:u, password:p, full_name:name, role:"admin" });
      if (!r?.ok && !r?.id) throw new Error(r?.error || "Create failed");
      setU(""); setP(""); setName("");
      await refresh();
    }catch(e){ alert(e?.message||"Create failed"); setErr(String(e?.message||e)); }
  }

  async function del(id){
    if (!confirm("Delete admin?")) return;
    try{
      const r = await API.ownerDeleteUser(token, id);
      if (!r?.ok) throw new Error(r?.error || "Delete failed");
      await refresh();
    }catch(e){
      // If the backend ever returns HTML error, our API._json already throws the HTML;
      // show a simpler alert here
      alert(e?.message?.slice(0,200) || "Delete failed");
    }
  }

  async function viewChanges(user){
    try{
      setShowAct(true);
      setActUser(user);
      setActRows([]);
      const r = await API.ownerUserChanges(token, user.id);
      setActUser(r.user || user);
      setActRows(r.rows || []);
    }catch(e){
      setErr(String(e?.message||e));
    }
  }

  return (
    <div className="p-4 bg-white rounded-2xl shadow relative">
      {err && <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{err}</div>}

      {/* Header + TZ selector */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Admins</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Time zone:</label>
          <select
            className="border rounded-xl p-2 text-sm"
            value={tz}
            onChange={e=>setTz(e.target.value)}
          >
            {[...new Set([browserTZ, ...COMMON_TZS])].map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <input className="border rounded-xl p-2.5" placeholder="username" value={u} onChange={e=>setU(e.target.value)} />
        <input className="border rounded-xl p-2.5" placeholder="full name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="border rounded-xl p-2.5" placeholder="password" type="password" value={p} onChange={e=>setP(e.target.value)} />
        <button className="px-3 py-2 rounded-xl bg-black text-white" onClick={addUser}>Add admin</button>
      </div>

      <table className="min-w-full text-sm mb-8">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Username</th>
            <th className="p-2 text-left">Full name</th>
            <th className="p-2 text-left">Role</th>
            <th className="p-2 text-left">Owner</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.username}</td>
              <td className="p-2">{r.full_name||"—"}</td>
              <td className="p-2">{r.role}</td>
              <td className="p-2">{r.is_owner ? "yes" : "no"}</td>
              <td className="p-2 flex gap-2">
                <button className="px-2 py-1 rounded-lg border" onClick={()=>viewChanges(r)}>Changes</button>
                {!r.is_owner && (
                  <button className="px-2 py-1 rounded-lg border" onClick={()=>del(r.id)}>Delete</button>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td className="p-3 text-gray-400" colSpan={5}>No admins</td></tr>}
        </tbody>
      </table>

      <h3 className="font-semibold mb-2">Login history (latest)</h3>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">When ({tz})</th>
            <th className="p-2 text-left">User</th>
            <th className="p-2 text-left">IP</th>
            <th className="p-2 text-left">Agent</th>
          </tr>
        </thead>
        <tbody>
          {logins.map(l=>(
            <tr key={l.id} className="border-t">
              <td className="p-2">{formatInTZ(l.created_at, tz)}</td>
              <td className="p-2">{l.username}</td>
              <td className="p-2">{l.ip||"—"}</td>
              <td className="p-2">{l.user_agent?.slice(0,60)||"—"}</td>
            </tr>
          ))}
          {!logins.length && <tr><td className="p-3 text-gray-400" colSpan={4}>No logins</td></tr>}
        </tbody>
      </table>

      {/* Activity side panel */}
      {showAct && (
        <div className="fixed inset-0 z-20 bg-black/30" onClick={()=>setShowAct(false)}>
          <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-xl p-4"
               onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Changes by {actUser?.username}</h4>
              <button className="px-3 py-1.5 rounded-lg border" onClick={()=>setShowAct(false)}>Close</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="p-2">When ({tz})</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Product</th>
                    <th className="p-2">Δ</th>
                    <th className="p-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {actRows.map(r=>(
                    <tr key={r.id} className="border-t">
                      <td className="p-2">{formatInTZ(r.created_at, tz)}</td>
                      <td className="p-2 font-mono">{r.sku}</td>
                      <td className="p-2">{r.product_name}</td>
                      <td className="p-2">{r.change}</td>
                      <td className="p-2">{r.reason}</td>
                    </tr>
                  ))}
                  {!actRows.length && <tr><td className="p-3 text-gray-400" colSpan={5}>No changes yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
