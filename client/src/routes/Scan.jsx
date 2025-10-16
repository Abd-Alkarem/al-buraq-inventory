import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useAuth, API } from "../state/auth.jsx";
import { useNavigate } from "react-router-dom";

export default function Scan() {
  const { token } = useAuth();
  const nav = useNavigate();
  const videoRef = useRef(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let active = true;
    (async () => {
      try {
        const devices = await reader.listVideoInputDevices();
        const id = devices?.[0]?.deviceId;
        if (!id) throw new Error("No camera found");
        await reader.decodeFromVideoDevice(id, videoRef.current, (result) => {
          if (!result || !active) return;
          handleDetected(result.getText());
        });
      } catch (e) { setErr(String(e)); }
    })();
    return () => { active = false; try { reader.reset(); } catch {} };
  }, []);

  async function handleDetected(code) {
    const list = await API.listProducts(token, code);
    if (Array.isArray(list) && list.length) nav(`/products/${list[0].id}`);
    else nav(`/products/new`); // optionally pass ?sku=...
  }

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="text-lg font-bold mb-2">Scan a Code</h3>
      <p className="text-sm text-gray-600 mb-3">Point your phone camera at the barcode.</p>
      {err && <div className="text-red-600 mb-2">{err}</div>}
      <video ref={videoRef} className="w-full max-h-[420px] rounded-xl bg-black" muted playsInline />
    </div>
  );
}
