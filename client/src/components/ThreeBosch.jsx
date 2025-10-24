import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";

/* --------- Gear (torus + cylinders for teeth) --------- */
function Gear({ color = "#e11d48", teeth = 12, r = 1, thickness = 0.3, speed = 0.01, onClick }) {
  const ref = useRef();
  useFrame(() => { ref.current.rotation.z += speed; });

  const teethArr = Array.from({ length: teeth });
  return (
    <group ref={ref} onClick={onClick}>
      {/* gear body */}
      <mesh castShadow receiveShadow>
        <torusGeometry args={[r, thickness * 0.35, 24, 100]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.35} />
      </mesh>

      {/* teeth */}
      {teethArr.map((_, i) => {
        const a = (i / teeth) * Math.PI * 2;
        const x = Math.cos(a) * (r + thickness * 0.2);
        const y = Math.sin(a) * (r + thickness * 0.2);
        return (
          <mesh key={i} position={[x, y, 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[thickness * 0.35, thickness, thickness * 0.6]} />
            <meshStandardMaterial color={color} metalness={0.8} roughness={0.35} />
          </mesh>
        );
      })}
      {/* axle */}
      <mesh>
        <cylinderGeometry args={[thickness * 0.35, thickness * 0.35, thickness * 2.2, 16]} />
        <meshStandardMaterial color="#f3f4f6" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

/* --------- Piston (cylinder + rod) --------- */
function Piston({ x = 2.2, speed = 0.01, onClick }) {
  const rod = useRef();
  const head = useRef();
  const t0 = useRef(Math.random() * Math.PI * 2);
  useFrame((_, dt) => {
    t0.current += speed * 3.2;
    const y = Math.sin(t0.current) * 0.6;
    rod.current.position.y = y / 2;
    head.current.position.y = y;
  });

  return (
    <group position={[x, 0, 0]} onClick={onClick}>
      {/* rod */}
      <mesh ref={rod} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 16]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* head */}
      <mesh ref={head} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.45, 28]} />
        <meshStandardMaterial color="#e5e7eb" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}

/* --------- Scene wrapper with lights and controls --------- */
function BoschScene() {
  const [spin, setSpin] = useState(0.012); // click to toggle speed
  const faster = () => setSpin(s => (s > 0.02 ? 0.005 : s + 0.008));

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 6]} intensity={1.1} castShadow />
      <pointLight position={[-4, -3, 3]} intensity={0.4} />

      <Gear r={1.2} thickness={0.35} teeth={16} speed={spin} onClick={faster} />
      <Piston x={2.4} speed={spin} onClick={faster} />

      {/* subtle ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial color="#0f172a" metalness={0.1} roughness={0.95} />
      </mesh>

      <Html position={[0, 1.9, 0]} center wrapperClass="pointer-events-none">
        <div className="text-xs px-2 py-1 rounded-lg bg-black/40 text-white/80 backdrop-blur">
          Click parts to change speed
        </div>
      </Html>

      <OrbitControls enablePan={false} minDistance={3.2} maxDistance={7} />
    </>
  );
}

/* --------- Exported Canvas --------- */
export default function ThreeBosch({ className = "", style }) {
  return (
    <div className={className} style={style}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [4, 2.3, 5], fov: 45 }}
      >
        <BoschScene />
      </Canvas>
    </div>
  );
}
