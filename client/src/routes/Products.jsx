// client/src/routes/Products.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, API } from "../state/auth.jsx";

export default function Products() {
  const { token } = useAuth();
  const [q,setQ] = useState("");
  const [brand,setBrand] = useState("");
  const [country,setCountry] = useState("");
  const [rows,setRows] = useState([]);

  useEffect(()=>{
    API.listProducts(token, q, { brand, country }).then(setRows);
  }, [token,q,brand,country]);

  return (
    <>
      <div className="bg-white rounded-2xl shadow p-4 mb-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex-1 grid gap-2 md:grid-cols-3">
            <input className="border rounded-xl p-2.5" placeholder="Search by SKU, name, brand, or country"
              value={q} onChange={e=>setQ(e.target.value)} />
            <input className="border rounded-xl p-2.5" placeholder="Brand" value={brand} onChange={e=>setBrand(e.target.value)} />
            <input className="border rounded-xl p-2.5" placeholder="Country" value={country} onChange={e=>setCountry(e.target.value)} />
          </div>
          <Link to="/products/new" className="ml-auto bg-red-600 text-white px-3 py-2 rounded-xl">
            Add Product
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-2xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              <th className="p-3">Image</th><th className="p-3">SKU</th><th className="p-3">Name</th>
              <th className="p-3">Brand</th><th className="p-3">Country</th>
              <th className="p-3 text-right">On Hand</th><th className="p-3 text-right">Sold</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  {r.images?.[0]
                    ? <img className="h-10 w-10 object-cover rounded-lg" src={`${API.base}${r.images[0]}`} alt="" />
                    : <div className="h-10 w-10 rounded-lg bg-gray-100" />}
                </td>
                <td className="p-3 font-mono">{r.sku}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.brand || "—"}</td>
                <td className="p-3">{r.country || "—"}</td>
                <td className="p-3 text-right">{r.on_hand}</td>
                <td className="p-3 text-right">{r.sold}</td>
                <td className="p-3">
                  <Link className="px-2 py-1 rounded-lg border" to={`/products/${r.id}`}>Edit</Link>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="p-6 text-center text-gray-400" colSpan={8}>No products</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
