import React, { useEffect, useState } from "react";
import { useAuth, API } from "../state/auth.jsx";

export default function Dashboard() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  useEffect(() => { API.listProducts(token).then(setRows); }, [token]);
  const totalOnHand = rows.reduce((a,b)=>a+(b.on_hand||0),0);
  const totalSold = rows.reduce((a,b)=>a+(b.sold||0),0);
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Card title="Products" value={rows.length} />
      <Card title="Total On Hand" value={totalOnHand} />
      <Card title="Total Sold" value={totalSold} />
    </section>
  );
}
function Card({ title, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
