import React, { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  Sparkles,
  Environment,
  RoundedBox,
  Cloud,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import * as THREE from "three";
import MagicParticles from "./MagicParticles";
import InstaxGallery from "./InstaxGallery";
import { useStore } from "../store";

const Snow: React.FC = () => {
  const count = 1500;
  const mesh = useRef<THREE.Points>(null);

  // Generate Soft Flake Texture
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, "rgba(255, 255, 255, 1)");
      g.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 32, 32);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const { positions, velocities } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const v = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 100; // Wide area x
      p[i * 3 + 1] = Math.random() * 60 - 20; // Height y (-20 to 40)
      p[i * 3 + 2] = (Math.random() - 0.5) * 100; // Wide area z

      v[i * 3] = (Math.random() - 0.5) * 0.02; // drift x
      v[i * 3 + 1] = Math.random() * 0.05 + 0.02; // speed y
      v[i * 3 + 2] = (Math.random() - 0.5) * 0.02; // drift z
    }
    return { positions: p, velocities: v };
  }, [count]);

  useFrame(() => {
    if (!mesh.current) return;
    const posAttr = mesh.current.geometry.attributes.position;
    const pos = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      // Fall down
      pos[i * 3 + 1] -= velocities[i * 3 + 1];
      // Drift
      pos[i * 3] += velocities[i * 3];
      pos[i * 3 + 2] += velocities[i * 3 + 2];

      // Reset
      if (pos[i * 3 + 1] < -20) {
        pos[i * 3 + 1] = 40;
        pos[i * 3] = (Math.random() - 0.5) * 100;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        size={0.4}
        color="#ffffff"
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Procedural Snow Ground
const SnowGround: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const mode = useStore((state) => state.mode);

  // Procedural Snow Texture
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // White Base
      ctx.fillStyle = "#f0f4f8";
      ctx.fillRect(0, 0, 512, 512);

      // Soft Noise for uneven snow look
      for (let i = 0; i < 30000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 2;
        const alpha = Math.random() * 0.05;
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 8);
    return t;
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Hide ground in Galaxy mode
    const targetScale = mode === "GALAXY" ? 0 : 1;
    const lerpSpeed = 1.5;

    const s = THREE.MathUtils.lerp(
      meshRef.current.scale.x,
      targetScale,
      delta * lerpSpeed
    );
    meshRef.current.scale.set(s, s, s);

    // Disable rendering if too small
    meshRef.current.visible = s > 0.01;
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -11, 0]}
      receiveShadow
    >
      <circleGeometry args={[45, 64]} />
      <meshStandardMaterial
        map={texture}
        color="#ffffff"
        roughness={1}
        metalness={0}
        envMapIntensity={0.5}
      />
    </mesh>
  );
};

// ------------------------------------------------------------------
// Bright Full Moon Component
// ------------------------------------------------------------------
const Moon: React.FC = () => {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Glowy white base
      const grd = ctx.createRadialGradient(256, 256, 100, 256, 256, 256);
      grd.addColorStop(0, "#ffffff");
      grd.addColorStop(1, "#e6e6e6");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 512, 512);

      // Craters
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 30 + 5;
        const alpha = Math.random() * 0.15;
        ctx.fillStyle = `rgba(180, 180, 190, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    // Position high in the background to the left
    <group position={[-30, 25, -50]}>
      <mesh>
        <sphereGeometry args={[6, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          color="#fffff0"
          emissive="#fffff0"
          emissiveIntensity={4.5} // Extremely bright to trigger heavy bloom
          roughness={0.4}
          toneMapped={false} // Allow brightness to exceed 1.0
        />
      </mesh>
      {/* Outer Glow Halo */}
      <mesh scale={[1.4, 1.4, 1.4]}>
        <sphereGeometry args={[6, 32, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.25}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Moonlight Point Source */}
      <pointLight intensity={3.5} distance={200} color="#e6e6fa" decay={1} />
    </group>
  );
};

// ------------------------------------------------------------------
// Night Sky Clouds
// ------------------------------------------------------------------
const NightClouds: React.FC = () => {
  return (
    <group position={[0, 15, -40]}>
      {/* Layer 1: Left high */}
      <Cloud
        position={[-25, 5, 0]}
        opacity={0.5}
        speed={0.1}
        bounds={[30, 4, 10]}
        segments={20}
        color="#aabbee"
      />
      {/* Layer 2: Right high */}
      <Cloud
        position={[25, 0, 5]}
        opacity={0.5}
        speed={0.1}
        bounds={[30, 4, 10]}
        segments={20}
        color="#aabbee"
      />
      {/* Layer 3: Central Ambient */}
      <Cloud
        position={[0, 10, -5]}
        opacity={0.4}
        speed={0.05}
        bounds={[60, 6, 15]}
        segments={30}
        color="#dceeff"
      />
    </group>
  );
};

// ------------------------------------------------------------------
// Presents (Gifts) Components - Defined before Deer
// ------------------------------------------------------------------

const Present: React.FC<{
  position: [number, number, number];
  scale: number;
  color: string;
  rotation: number;
}> = ({ position, scale, color, rotation }) => {
  const groupRef = useRef<THREE.Group>(null);
  const mode = useStore((state) => state.mode);

  // Animate visibility based on mode (Show in TREE, Hide in GALAXY)
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const targetScale = mode === "GALAXY" ? 0 : scale;
    const lerpSpeed = 2.0;
    const s = THREE.MathUtils.lerp(
      groupRef.current.scale.x,
      targetScale,
      delta * lerpSpeed
    );
    groupRef.current.scale.set(s, s, s);
    groupRef.current.visible = s > 0.01;
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      {/* Box Body - Rounded for soft premium look */}
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <RoundedBox args={[1, 1, 1]} radius={0.08} smoothness={4}>
          <meshPhysicalMaterial
            color={color}
            roughness={0.2}
            metalness={0.1}
            clearcoat={0.5}
          />
        </RoundedBox>
      </mesh>

      {/* Ribbon Vertical */}
      <mesh position={[0, 0.5, 0]} receiveShadow>
        <boxGeometry args={[1.02, 1.02, 0.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>

      {/* Ribbon Horizontal */}
      <mesh position={[0, 0.5, 0]} receiveShadow>
        <boxGeometry args={[0.2, 1.02, 1.02]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>

      {/* Bow Top */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <torusGeometry args={[0.15, 0.05, 8, 16]} />
        <meshStandardMaterial color="#ffd700" metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.05, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.15, 0.05, 8, 16]} />
        <meshStandardMaterial color="#ffd700" metalness={0.5} roughness={0.2} />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------
// Luxury Realistic Deer Component
// ------------------------------------------------------------------
const Deer: React.FC = () => {
  const group = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const mode = useStore((state) => state.mode);

  useFrame((state, delta) => {
    if (!group.current) return;

    // Hide in Galaxy Mode
    const targetScale = mode === "GALAXY" ? 0 : 2.5; // Big scale
    const s = THREE.MathUtils.lerp(
      group.current.scale.x,
      targetScale,
      delta * 2
    );
    group.current.scale.set(s, s, s);
    group.current.visible = s > 0.01;

    // Subtle "Alive" Animation & Pose
    if (headRef.current) {
      // Bend Forward (Look Down) - Negative X rotation
      // -0.4 to counteract the natural neck back-lean (0.7) and tilt forward
      headRef.current.rotation.x =
        -0.4 + Math.sin(state.clock.elapsedTime * 0.2) * 0.05;

      // Subtle side-to-side scan (Looking around slightly)
      headRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.3) * 0.1;

      // Minimal tilt
      headRef.current.rotation.z =
        Math.sin(state.clock.elapsedTime * 0.4) * 0.02;
    }
  });

  // --- Materials & Textures ---
  const furTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Base Brown
      ctx.fillStyle = "#654321";
      ctx.fillRect(0, 0, 512, 512);

      // Noise / Fur strands
      for (let i = 0; i < 60000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const l = Math.random() * 4 + 2;
        const a = Math.random() * Math.PI * 2;

        ctx.strokeStyle = Math.random() > 0.5 ? "#5d3a1a" : "#8b5a2b";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        ctx.stroke();
      }
    }
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    return t;
  }, []);

  const furMaterial = (
    <meshStandardMaterial
      map={furTexture}
      bumpMap={furTexture}
      bumpScale={0.15}
      color="#ffffff"
      roughness={1.0}
      metalness={0.0}
    />
  );

  const antlerMaterial = (
    <meshStandardMaterial color="#E6D7B8" roughness={0.7} metalness={0} />
  );

  const hoofMaterial = <meshStandardMaterial color="#1a1a1a" roughness={0.6} />;

  const noseMaterial = (
    <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.2} />
  );

  return (
    <group ref={group} position={[13, -11, 4]} rotation={[0, 2.0, 0]}>
      {/* === BODY === */}
      <group position={[0, 2.7, 0]}>
        {/* Chest / Front Body */}
        <mesh position={[0, 0.2, -0.6]} castShadow>
          <RoundedBox args={[1.7, 1.7, 1.8]} radius={0.6} smoothness={8}>
            {furMaterial}
          </RoundedBox>
        </mesh>
        {/* Belly / Rear Body */}
        <mesh position={[0, 0.25, 0.8]} castShadow>
          <RoundedBox args={[1.65, 1.65, 1.8]} radius={0.6} smoothness={8}>
            {furMaterial}
          </RoundedBox>
        </mesh>
        {/* Spine Connector - Lowered to 0.2 to make back straight */}
        <mesh position={[0, 0.2, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.85, 0.85, 1.5, 16]} />
          {furMaterial}
        </mesh>
      </group>

      {/* === LEGS === */}
      {/* Front Left */}
      <group position={[-0.5, 2.5, -1.1]}>
        {/* Upper Leg */}
        <mesh position={[0, -0.4, 0]} rotation={[0.05, 0, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.22, 1.0]} />
          {furMaterial}
        </mesh>
        {/* Knee */}
        <mesh position={[0, -1.0, 0.05]} castShadow>
          <sphereGeometry args={[0.23]} />
          {furMaterial}
        </mesh>
        {/* Lower Leg */}
        <mesh position={[0, -1.6, 0.02]} rotation={[-0.05, 0, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.15, 1.2]} />
          {furMaterial}
        </mesh>
        <mesh position={[0, -2.25, 0.05]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.3]} />
          {hoofMaterial}
        </mesh>
      </group>

      {/* Front Right */}
      <group position={[0.5, 2.5, -1.1]}>
        {/* Upper Leg */}
        <mesh position={[0, -0.4, 0]} rotation={[0.05, 0, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.22, 1.0]} />
          {furMaterial}
        </mesh>
        {/* Knee */}
        <mesh position={[0, -1.0, 0.05]} castShadow>
          <sphereGeometry args={[0.23]} />
          {furMaterial}
        </mesh>
        {/* Lower Leg */}
        <mesh position={[0, -1.6, 0.02]} rotation={[-0.05, 0, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.15, 1.2]} />
          {furMaterial}
        </mesh>
        <mesh position={[0, -2.25, 0.05]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.3]} />
          {hoofMaterial}
        </mesh>
      </group>

      {/* Back Left */}
      <group position={[-0.5, 2.7, 1.3]}>
        {/* Thigh (Femur) - Angled Front-Down */}
        <mesh position={[0, -0.5, 0.1]} rotation={[0.4, 0, 0]} castShadow>
          <capsuleGeometry args={[0.36, 1.1, 4, 8]} />
          {furMaterial}
        </mesh>
        {/* Knee Connection */}
        <mesh position={[0, -1.0, -0.2]} castShadow>
          <sphereGeometry args={[0.25]} />
          {furMaterial}
        </mesh>
        {/* Shin/Leg - Coming out of thigh */}
        <mesh position={[0, -1.7, 0.0]} rotation={[-0.2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.14, 1.4]} />
          {furMaterial}
        </mesh>
        {/* Hoof */}
        <mesh position={[0, -2.45, 0.15]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.3]} />
          {hoofMaterial}
        </mesh>
      </group>

      {/* Back Right - Position Corrected to 0.5 */}
      <group position={[0.5, 2.7, 1.3]}>
        {/* Thigh (Femur) - Angled Front-Down */}
        <mesh position={[0, -0.5, 0.1]} rotation={[0.4, 0, 0]} castShadow>
          <capsuleGeometry args={[0.36, 1.1, 4, 8]} />
          {furMaterial}
        </mesh>
        {/* Knee Connection */}
        <mesh position={[0, -1.0, -0.2]} castShadow>
          <sphereGeometry args={[0.25]} />
          {furMaterial}
        </mesh>
        {/* Shin/Leg - Coming out of thigh */}
        <mesh position={[0, -1.7, 0.0]} rotation={[-0.2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.14, 1.4]} />
          {furMaterial}
        </mesh>
        {/* Hoof */}
        <mesh position={[0, -2.45, 0.15]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.3]} />
          {hoofMaterial}
        </mesh>
      </group>

      {/* === NECK & HEAD === */}
      <group ref={headRef} position={[0, 3.4, -1.3]}>
        {/* Neck - Shortened (1.3) and Lowered (0.65) */}
        <mesh position={[0, 0.65, 0.3]} rotation={[0.7, 0, 0]} castShadow>
          <capsuleGeometry args={[0.4, 1.3, 4, 16]} />
          {furMaterial}
        </mesh>

        {/* Head Main - Lowered (1.5) to attach to shorter neck */}
        <group position={[0, 1.5, 0.3]}>
          {/* Cranium */}
          <mesh position={[0, 0.1, 0.1]} rotation={[0.2, 0, 0]} castShadow>
            <RoundedBox args={[0.7, 0.75, 0.8]} radius={0.3} smoothness={8}>
              {furMaterial}
            </RoundedBox>
          </mesh>

          {/* Muzzle / Snout - Organic Shape */}
          <mesh
            position={[0, -0.05, -0.6]}
            rotation={[0.2, 0, 0]}
            scale={[0.9, 0.8, 1.4]}
            castShadow
          >
            <sphereGeometry args={[0.35, 32, 32]} />
            {furMaterial}
          </mesh>

          {/* Nose */}
          <mesh position={[0, 0.08, -1.05]} castShadow>
            <sphereGeometry args={[0.1, 16, 16]} />
            {noseMaterial}
          </mesh>

          {/* Eyes */}
          <group position={[0, 0.2, -0.3]} rotation={[0.2, 0, 0]}>
            <mesh position={[0.32, 0, 0]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              {noseMaterial}
            </mesh>
            <mesh position={[-0.32, 0, 0]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              {noseMaterial}
            </mesh>
          </group>

          {/* Mouth */}
          <mesh position={[0, -0.15, -0.9]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.02, 0.12, 4, 8]} />
            <meshStandardMaterial color="#000" roughness={0.8} />
          </mesh>

          {/* Ears */}
          <mesh position={[0.4, 0.45, 0.2]} rotation={[0, 0, 0.5]} castShadow>
            <coneGeometry args={[0.12, 0.6, 16]} />
            {furMaterial}
          </mesh>
          <mesh position={[-0.4, 0.45, 0.2]} rotation={[0, 0, -0.5]} castShadow>
            <coneGeometry args={[0.12, 0.6, 16]} />
            {furMaterial}
          </mesh>

          {/* Antlers */}
          <group position={[0, 0.5, 0]} rotation={[-0.2, 0, 0]}>
            {/* Left Antler Base */}
            <mesh position={[-0.2, 0.5, 0]} rotation={[0, 0, 0.5]}>
              <cylinderGeometry args={[0.05, 0.08, 1.4]} />
              {antlerMaterial}
            </mesh>
            {/* Left Branches */}
            <mesh position={[-0.6, 1.0, 0]} rotation={[0, 0, 1.1]}>
              <cylinderGeometry args={[0.04, 0.06, 0.9]} />
              {antlerMaterial}
            </mesh>
            <mesh position={[-0.4, 0.6, 0.2]} rotation={[0.5, 0, 0.4]}>
              <cylinderGeometry args={[0.03, 0.05, 0.7]} />
              {antlerMaterial}
            </mesh>

            {/* Right Antler Base */}
            <mesh position={[0.2, 0.5, 0]} rotation={[0, 0, -0.5]}>
              <cylinderGeometry args={[0.05, 0.08, 1.4]} />
              {antlerMaterial}
            </mesh>
            {/* Right Branches */}
            <mesh position={[0.6, 1.0, 0]} rotation={[0, 0, -1.1]}>
              <cylinderGeometry args={[0.04, 0.06, 0.9]} />
              {antlerMaterial}
            </mesh>
            <mesh position={[0.4, 0.6, 0.2]} rotation={[0.5, 0, -0.4]}>
              <cylinderGeometry args={[0.03, 0.05, 0.7]} />
              {antlerMaterial}
            </mesh>
          </group>
        </group>
      </group>

      {/* Tail */}
      <mesh position={[0, 3.2, 1.7]} rotation={[1.2, 0, 0]} castShadow>
        <coneGeometry args={[0.15, 0.5, 16]} />
        {furMaterial}
      </mesh>

      {/* SPECIAL PRESENT: Interacting with Deer */}
      <Present
        position={[0, 0.6, -2.8]}
        scale={1.5}
        color="#c30000"
        rotation={0.5}
      />
    </group>
  );
};

// ------------------------------------------------------------------
// Cute Chubby Snowman Component
// ------------------------------------------------------------------
const Snowman: React.FC = () => {
  const group = useRef<THREE.Group>(null);
  const mode = useStore((state) => state.mode);

  useFrame((state, delta) => {
    if (!group.current) return;

    // Hide in Galaxy Mode
    const targetScale = mode === "GALAXY" ? 0 : 1;
    const s = THREE.MathUtils.lerp(
      group.current.scale.x,
      targetScale,
      delta * 2
    );
    group.current.scale.set(s, s, s);
    group.current.visible = s > 0.01;

    // Cute swaying animation
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
    group.current.rotation.y =
      0.5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1; // Base rotation + sway
  });

  const snowMaterial = (
    <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0.05} />
  );

  return (
    // Positioned opposite to the deer (x: -11)
    <group ref={group} position={[-11, -11, 4]} rotation={[0, 0.5, 0]}>
      {/* === BODY === */}
      {/* Bottom Sphere - Chubby & Squashed */}
      <mesh
        position={[0, 1.8, 0]}
        scale={[1.1, 0.9, 1.1]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[2.0, 32, 32]} />
        {snowMaterial}
      </mesh>

      {/* Middle Sphere */}
      <mesh
        position={[0, 4.2, 0]}
        scale={[1.05, 0.9, 1.05]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1.5, 32, 32]} />
        {snowMaterial}
      </mesh>

      {/* Head Sphere */}
      <mesh position={[0, 6.5, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1.1, 32, 32]} />
        {snowMaterial}
      </mesh>

      {/* === ACCESSORIES === */}

      {/* Buttons (Coal) */}
      <group position={[0, 4.2, 1.4]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#1a1a1a" roughness={1} />
        </mesh>
        <mesh position={[0, 0, 0.05]} castShadow>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#1a1a1a" roughness={1} />
        </mesh>
        <mesh position={[0, -0.5, 0]} castShadow>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#1a1a1a" roughness={1} />
        </mesh>
      </group>

      {/* Scarf (Red) */}
      {/* Rotated X to Math.PI/2 + 0.1 to lay flat around neck, slightly tilted */}
      <group position={[0, 5.6, 0]} rotation={[Math.PI / 2 + 0.1, 0, 0]}>
        <mesh castShadow>
          <torusGeometry args={[1.1, 0.25, 16, 32]} />
          <meshStandardMaterial color="#c30000" roughness={1} />
        </mesh>
        {/* Scarf tails - Hanging down */}
        {/* Positioned on the side (0.7), hanging down (Z=1.0 because group is rotated) */}
        <mesh position={[0.7, 0.2, 1.0]} rotation={[1.2, 0, -0.2]} castShadow>
          <cylinderGeometry args={[0.2, 0.25, 1.8]} />
          <meshStandardMaterial color="#c30000" roughness={1} />
        </mesh>
      </group>

      {/* Hat (Top Hat) */}
      <group position={[0, 7.4, 0]} rotation={[-0.1, 0, 0]}>
        {/* Brim */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[1.6, 1.6, 0.1, 32]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
        {/* Top */}
        <mesh position={[0, 0.8, 0]} castShadow>
          <cylinderGeometry args={[1.0, 1.0, 1.6, 32]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
        {/* Ribbon */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[1.02, 1.02, 0.25, 32]} />
          <meshStandardMaterial color="#c30000" />
        </mesh>
      </group>

      {/* === FACE === */}
      <group position={[0, 6.5, 0.95]}>
        {/* Eyes */}
        <mesh position={[-0.4, 0.2, 0.05]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#000" roughness={0.2} />
        </mesh>
        <mesh position={[0.4, 0.2, 0.05]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#000" roughness={0.2} />
        </mesh>

        {/* Nose (Carrot) */}
        <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <coneGeometry args={[0.12, 0.8, 16]} />
          <meshStandardMaterial color="#ff6600" roughness={0.5} />
        </mesh>

        {/* Mouth (Smile) */}
        <group position={[0, -0.3, 0.1]} rotation={[0.2, 0, 0]}>
          {[-0.3, -0.15, 0, 0.15, 0.3].map((x, i) => (
            <mesh key={i} position={[x, Math.abs(x) * 0.3, 0]}>
              <sphereGeometry args={[0.06]} />
              <meshStandardMaterial color="#000" />
            </mesh>
          ))}
        </group>
      </group>

      {/* === ARMS (Sticks) === */}
      {/* Left Arm */}
      <group position={[-1.3, 4.8, 0]} rotation={[0, 0, 0.5]}>
        <mesh position={[-0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 1.8]} />
          <meshStandardMaterial color="#5d3a1a" roughness={1} />
        </mesh>
        {/* Fingers */}
        <mesh position={[-1.7, 0, 0.2]} rotation={[0.5, 0.5, 0]}>
          <cylinderGeometry args={[0.03, 0.04, 0.5]} />
          <meshStandardMaterial color="#5d3a1a" roughness={1} />
        </mesh>
      </group>

      {/* Right Arm (Waving up) */}
      <group position={[1.3, 4.8, 0]} rotation={[0, 0, -0.8]}>
        <mesh position={[0.8, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 1.8]} />
          <meshStandardMaterial color="#5d3a1a" roughness={1} />
        </mesh>
        {/* Fingers */}
        <mesh position={[1.7, 0, -0.1]} rotation={[0.2, 0, 0.5]}>
          <cylinderGeometry args={[0.03, 0.04, 0.5]} />
          <meshStandardMaterial color="#5d3a1a" roughness={1} />
        </mesh>
      </group>
    </group>
  );
};

const PresentsGroup: React.FC = () => {
  const presents = useMemo(() => {
    const items = [];
    const count = 20;
    // Luxurious holiday palette
    const colors = [
      "#8b0000", // Deep Red
      "#006400", // Dark Green
      "#191970", // Midnight Blue
      "#b8860b", // Dark Goldenrod
      "#800080", // Purple
      "#c0c0c0", // Silver
    ];

    for (let i = 0; i < count; i++) {
      // Random position in a ring around the tree
      const angle = Math.random() * Math.PI * 2;
      const minRadius = 9; // Slightly increased for bigger boxes
      const maxRadius = 18; // Increased
      const radius =
        Math.sqrt(Math.random()) * (maxRadius - minRadius) + minRadius;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Random scale - Increased significantly (2.0 to 3.5)
      const s = Math.random() * 1.5 + 2.0;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const rot = Math.random() * Math.PI;

      items.push({
        pos: [x, -11, z] as [number, number, number],
        scale: s,
        color,
        rot,
      });
    }
    return items;
  }, []);

  return (
    <group>
      {presents.map((p, i) => (
        <Present
          key={i}
          position={p.pos}
          scale={p.scale}
          color={p.color}
          rotation={p.rot}
        />
      ))}
    </group>
  );
};

// Scene Content Wrapper to handle Rotation
const SceneContent: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const handPosition = useStore((state) => state.handPosition);
  const mode = useStore((state) => state.mode);
  const viewMode = useStore((state) => state.viewMode);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // FREEZE ROTATION IN VIEW MODE
      // If the user is inspecting a photo, we stop the background from spinning/resetting
      // so everything stays perfectly still.
      if (viewMode) return;

      let targetRotX = 0;
      let targetRotY = 0;

      const isGalaxy = mode === "GALAXY";
      // Increased sensitivity for Galaxy mode as requested (was 0.8/0.5)
      const sensitivityX = isGalaxy ? 2.5 : 0.8;
      const sensitivityY = isGalaxy ? 1.5 : 0.5;

      targetRotX = handPosition.y * sensitivityY;
      targetRotY = handPosition.x * sensitivityX;

      // Smooth Damp
      const lambda = 4.0;
      const alpha = 1 - Math.exp(-lambda * delta);

      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetRotX,
        alpha
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotY,
        alpha
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <MagicParticles />
      <SnowGround />
      <PresentsGroup />
      <Deer />
      <Snowman />
      {/* Wrapped in Suspense to prevent stalling the entire scene while fonts/textures load */}
      <Suspense fallback={null}>
        <InstaxGallery />
      </Suspense>
    </group>
  );
};

const Experience: React.FC = () => {
  const viewMode = useStore((state) => state.viewMode);

  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas
        camera={{ position: [0, 2, 45], fov: 45 }}
        gl={{ antialias: true, toneMappingExposure: 1.2 }}
        dpr={[1, 2]}
        shadows
      >
        <Suspense fallback={null}>
          <color attach="background" args={["#010103"]} />
          <fog attach="fog" args={["#010103", 10, 120]} />

          {/* Realistic Reflections */}
          <Environment preset="sunset" blur={0.6} />

          {/* Cinematic Lighting */}
          <ambientLight intensity={0.2} />

          <directionalLight
            position={[10, 10, 5]}
            intensity={2}
            color="#ffffff"
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          <pointLight
            position={[-10, -5, -10]}
            intensity={1.5}
            color="#00ccff"
            distance={40}
          />
          <pointLight
            position={[5, -2, 5]}
            intensity={1}
            color="#ff00aa"
            distance={30}
          />

          {/* Environment Stars */}
          <Stars
            radius={100}
            depth={50}
            count={2000}
            factor={4}
            saturation={1}
            fade
            speed={0.5}
          />
          <Sparkles
            count={200}
            scale={20}
            size={2}
            speed={0.2}
            opacity={0.2}
            color="#ffd700"
          />

          {/* Full Moon */}
          <Moon />

          {/* Night Clouds */}
          <NightClouds />

          <Snow />

          {/* Rotatable Content */}
          <SceneContent />

          {/* Post Processing */}
          <EffectComposer enableNormalPass={false}>
            {/* Subtle bloom for the shiny highlights */}
            <Bloom
              luminanceThreshold={1}
              mipmapBlur
              intensity={0.5}
              radius={0.3}
            />
            <Noise opacity={0.02} />
            <Vignette eskil={false} offset={0.1} darkness={0.8} />
          </EffectComposer>

          {/* Controls - Increased autoRotateSpeed */}
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={10}
            maxDistance={60}
            autoRotate={!viewMode} // Disable auto-rotation when viewing a photo
            autoRotateSpeed={2.0}
            maxPolarAngle={Math.PI / 1.5}
            minPolarAngle={Math.PI / 3.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Experience;
