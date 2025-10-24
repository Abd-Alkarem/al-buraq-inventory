// client/src/routes/ProductForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth, API } from "../state/auth.jsx";
import { useCurrency } from "../hooks/useCurrency.jsx";

const TIMEZONES = [
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  "UTC", "Asia/Riyadh", "Asia/Dubai", "Africa/Cairo", "America/Toronto", "Europe/London"
];

export default function ProductForm({ mode }) {
  const isCreate = mode === "create";
  const { id } = useParams();
  const nav = useNavigate();
  const { token, user } = useAuth();
  const { currency, formatWithSymbol } = useCurrency();

  // banner error
  const [err, setErr] = useState("");

  // Keep price & cost as dollars for comfortable input
  const [price, setPrice] = useState("0.00");
  const [cost, setCost] = useState("0.00");

  const [p, setP] = useState({
    sku: "", name: "", brand: "", country: "", description: "",
    price_cents: 0, cost_cents: 0, on_hand: 0, sold: 0, images: []
  });

  const [moves, setMoves] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tz, setTz] = useState(localStorage.getItem("tz") || TIMEZONES[0]);

  const [newImages, setNewImages] = useState([]); // File[]

  useEffect(() => { localStorage.setItem("tz", tz); }, [tz]);

  useEffect(() => {
    if (!isCreate) {
      API.getProduct(token, id).then((data) => {
        data.images = data.images || [];
        setP(data);
        setPrice(((data.price_cents || 0) / 100).toFixed(2));
        setCost(((data.cost_cents || 0) / 100).toFixed(2));
        API.movements(token, id).then(setMoves);
        if (API.listNotes) API.listNotes(token, id).then(setNotes).catch(() => {});
      });
    } else {
      setP(prev => ({ ...prev, images: [] }));
      setPrice("0.00"); setCost("0.00");
    }
  }, [isCreate, id, token]);

  const totalSales = useMemo(() => {
    const pr = (p.price_cents || 0) / 100;
    return (pr * (p.sold || 0)).toFixed(2);
  }, [p.price_cents, p.sold]);

  function fmtDate(s) {
    // treat DB time as UTC; if 'Z' missing, add it
    const iso = s && !s.endsWith("Z") ? `${s}Z` : s;
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat(undefined, {
        timeZone: tz, year: "numeric", month: "short", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      }).format(d);
    } catch { return s; }
  }
  const dollarsToCents = v => Math.round(Number(v || 0) * 100) || 0;

  // save with error banner and image upload
  async function save(e) {
    e.preventDefault();
    setErr("");
    if (!/^\d+$/.test(p.sku)) {
      setErr("SKU must be numbers only");
      return;
    }
    try {
      const payload = {
        ...p,
        price_cents: Math.round(Number(price || 0) * 100),
        cost_cents: Math.round(Number(cost || 0) * 100)
      };

      let created = null;
      if (isCreate) {
        created = await API.createProduct(token, payload);
        if (!created?.id) throw new Error(created?.error || "Create failed");
      } else {
        const updated = await API.updateProduct(token, id, payload);
        if (!updated?.id) throw new Error(updated?.error || "Update failed");
      }
      const pid = isCreate ? created.id : id;

      // upload queued images
      for (const file of newImages) { await API.uploadImage(token, pid, file); }

      // go to edit page after create
      if (isCreate) return nav(`/products/${pid}`);
      alert("Saved");
    } catch (e2) {
      setErr(String(e2?.message || e2));
    }
  }

  async function doStock(delta, reason) {
    if (reason === "sale" && p.on_hand <= 0) {
      alert("Cannot sell. Stock is 0.");
      return;
    }
    const u = await API.changeStock(token, id, delta, reason);
    if (u?.error) { alert(u.error); return; }
    setP(u);
    API.movements(token, id).then(setMoves);
  }

  async function addNote(e) {
    e.preventDefault();
    if (!API.addNote) return;
    const fd = new FormData(e.currentTarget);
    const note_date = fd.get("date");
    const body = fd.get("body");
    if (!note_date) return;
    const n = await API.addNote(token, id, { note_date, body });
    setNotes(prev => [n, ...prev]);
    e.currentTarget.reset();
  }

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      {/* error banner */}
      {err && <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{err}</div>}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{isCreate ? "Add Product" : `Edit: ${p.name}`}</h3>
        <div className="text-sm text-gray-600">Admin: <b>{user?.username}</b></div>
      </div>

      <form className="space-y-3" onSubmit={save}>
        <L label="SKU (numbers only)">
          <input
            className="w-full border rounded-xl p-2.5"
            value={p.sku}
            onChange={e => setP({ ...p, sku: e.target.value.replace(/[^\d]/g, "") })}
            required
          />
        </L>
        <L label="Name">
          <input
            className="w-full border rounded-xl p-2.5"
            value={p.name}
            onChange={e => setP({ ...p, name: e.target.value })}
            required
          />
        </L>
        <L label="Brand">
          <input className="w-full border rounded-xl p-2.5" value={p.brand || ""}
                 onChange={e => setP({ ...p, brand: e.target.value })} />
        </L>
        <L label="Country of Origin">
          <input className="w-full border rounded-xl p-2.5" value={p.country}
                 onChange={e => setP({ ...p, country: e.target.value })} />
        </L>
        <L label="Description">
          <textarea className="w-full border rounded-xl p-2.5" rows={3} value={p.description}
                    onChange={e => setP({ ...p, description: e.target.value })} />
        </L>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <L label="Price (USD)">
            <input className="w-full border rounded-xl p-2.5" inputMode="decimal"
                   value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} />
            {currency !== "USD" && price && (
              <p className="text-xs text-gray-500 mt-1">≈ {formatWithSymbol(parseFloat(price))}</p>
            )}
          </L>
          <L label="Cost (USD)">
            <input className="w-full border rounded-xl p-2.5" inputMode="decimal"
                   value={cost} onChange={e => setCost(e.target.value.replace(/[^0-9.]/g, ""))} />
            {currency !== "USD" && cost && (
              <p className="text-xs text-gray-500 mt-1">≈ {formatWithSymbol(parseFloat(cost))}</p>
            )}
          </L>
          <div />
          <L label="On Hand">
            <input type="number" className="w-full border rounded-xl p-2.5" value={p.on_hand}
                   onChange={e => setP({ ...p, on_hand: parseInt(e.target.value || "0") })} />
          </L>
          <L label="Sold">
            <input type="number" className="w-full border rounded-xl p-2.5" value={p.sold}
                   onChange={e => setP({ ...p, sold: parseInt(e.target.value || "0") })} />
          </L>
        </div>

        {/* image picker even during create */}
        <div className="flex items-center gap-2">
          <label className="px-3 py-2 rounded-xl border cursor-pointer">
            Add Images
            <input
              type="file"
              accept="image/*"
              className="hidden"
              multiple
              onChange={e => setNewImages(Array.from(e.target.files || []))}
            />
          </label>
          {!!newImages.length && (
            <div className="text-sm text-gray-600">{newImages.length} image(s) queued</div>
          )}
          <div className="flex-1" />
          {!isCreate && (
            <>
              <button
                type="button"
                onClick={() => doStock(-1, "sale")}
                disabled={p.on_hand <= 0}
                className={`px-3 py-2 rounded-xl border text-white ${p.on_hand <= 0 ? "bg-green-300 cursor-not-allowed" : "bg-green-600"}`}
              >
                Sell 1
              </button>
              <button type="button" onClick={() => doStock(-1, "adjust")} className="px-3 py-2 rounded-xl border">-1 Stock</button>
              <button type="button" onClick={() => doStock(+1, "purchase")} className="px-3 py-2 rounded-xl border">+1 Stock</button>
            </>
          )}
          <button className="px-3 py-2 rounded-xl bg-black text-white">Save</button>
        </div>
      </form>

      {/* images */}
      {!isCreate && (
        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2">Images</div>
          <div className="grid grid-cols-3 gap-2">
            {p.images?.map((u, i) => (
              <img key={i} src={`${API.base}${u}`} className="h-20 w-full object-cover rounded-lg" alt="" />
            ))}
            {!p.images?.length && <div className="text-xs text-gray-400">No images yet.</div>}
          </div>
        </div>
      )}

      {/* history */}
      {!isCreate && (
        <div className="mt-6">
          <div className="flex items-end justify-between">
            <h4 className="font-semibold">History / Movements</h4>
            <div className="flex items-center gap-2 text-sm">
              <span>Timezone:</span>
              <select className="border rounded-lg px-2 py-1" value={tz} onChange={e => setTz(e.target.value)}>
                {Array.from(new Set(TIMEZONES)).map(z => <option key={z} value={z}>{z}</option>)}
              </select>
              <div className="text-gray-600">Total Sales: <b>${totalSales}</b></div>
            </div>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="p-2">When</th><th className="p-2">Change</th><th className="p-2">Reason</th><th className="p-2">By</th>
                </tr>
              </thead>
              <tbody>
                {moves.map(m => (
                  <tr key={m.id} className="border-t">
                    <td className="p-2">{fmtDate(m.created_at)}</td>
                    <td className="p-2">{m.change}</td>
                    <td className="p-2">{m.reason}</td>
                    <td className="p-2">{m.username || "public"}</td>
                  </tr>
                ))}
                {!moves.length && <tr><td className="p-3 text-gray-400" colSpan={4}>No history yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* notes */}
      {!isCreate && (
        <div className="mt-6">
          <h4 className="font-semibold">Notes</h4>
          <form className="flex gap-2 mt-2" onSubmit={addNote}>
            <input name="date" type="date" className="border rounded-xl p-2.5" required />
            <input name="body" className="flex-1 border rounded-xl p-2.5" placeholder="Note…" />
            <button className="px-3 py-2 rounded-xl border">Add</button>
          </form>
          <ul className="mt-2 text-sm">
            {notes.map(n => (
              <li key={n.id} className="border-t py-2">
                <b>{n.note_date}:</b> {n.body || "—"}
              </li>
            ))}
            {!notes.length && <li className="text-gray-400">No notes.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function L({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
