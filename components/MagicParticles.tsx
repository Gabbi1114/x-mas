import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';

// Increased tree size to allow space for non-overlapping giant balls
const TREE_HEIGHT = 22;
const TREE_RADIUS_BASE = 10;
const GALAXY_RADIUS = 45;

// Helper to generate Candy Texture (Stripes)
const generateCandyTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  // White base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);

  // Red diagonal stripes
  ctx.fillStyle = '#c30000';
  ctx.beginPath();
  const step = 60;
  for (let i = -512; i < 1024; i += step) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 30, 0);
    ctx.lineTo(i - 30 + 512, 512);
    ctx.lineTo(i - 60 + 512, 512);
    ctx.fill();
  }
  
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
};

// -------------------------------------------------------------
// Core Logic: Sphere Packing Generator
// -------------------------------------------------------------
const usePackingLogic = (ornamentCount: number, candyCount: number) => {
  const totalCount = ornamentCount + candyCount;

  return useMemo(() => {
    const pTree = new Float32Array(totalCount * 3);
    const pGalaxy = new Float32Array(totalCount * 3);
    const scales = new Float32Array(totalCount);
    
    // Track valid positions to prevent overlap
    const validPositions: { x: number, y: number, z: number, r: number }[] = [];

    for (let i = 0; i < totalCount; i++) {
      const i3 = i * 3;
      
      // 1. Determine Scale first (Big balls)
      // Scale 0.6 to 1.1
      const scale = Math.random() * 0.5 + 0.6;
      scales[i] = scale;
      const radius = scale * 1.0; // approx geometry radius * scale

      // 2. Find a non-overlapping position in Tree shape
      let x = 0, y = 0, z = 0;
      let attempt = 0;
      let valid = false;
      const maxAttempts = 50;

      while (!valid && attempt < maxAttempts) {
        attempt++;
        
        // Random point in Cone
        const h = Math.random(); // 0 to 1 height factor
        y = (h - 0.5) * TREE_HEIGHT;
        
        // Radius at this height (tapered)
        const currentRadiusLimit = (1 - h) * TREE_RADIUS_BASE; 
        
        // Random circle pos
        const angle = Math.random() * Math.PI * 2;
        // SqRoot for even distribution in circle, but we want them packed, simple random is fine
        const r = Math.random() * currentRadiusLimit; 

        x = Math.cos(angle) * r;
        z = Math.sin(angle) * r;

        // Collision Check
        let collision = false;
        // Check against recent neighbors (optimization: not checking all 1000 every time if not needed, but for 600 it's fast enough)
        for (let j = 0; j < validPositions.length; j++) {
            const p = validPositions[j];
            const dx = x - p.x;
            const dy = y - p.y;
            const dz = z - p.z;
            const distSq = dx*dx + dy*dy + dz*dz;
            const minDist = radius + p.r + 0.1; // 0.1 padding
            if (distSq < minDist * minDist) {
                collision = true;
                break;
            }
        }
        
        if (!collision) valid = true;
      }

      // If we failed to find a spot after maxAttempts, just place it on the outside or accept overlap
      // to avoid infinite loops. Usually expanding tree dimensions fixes this.
      
      pTree[i3] = x;
      pTree[i3 + 1] = y;
      pTree[i3 + 2] = z;

      validPositions.push({ x, y, z, r: radius });

      // --- Galaxy Shape (Sphere Universe) ---
      // No collision check needed for galaxy (huge space), just random
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const rad = GALAXY_RADIUS * Math.cbrt(Math.random()); 
      
      pGalaxy[i3] = rad * Math.sin(phi) * Math.cos(theta);
      pGalaxy[i3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
      pGalaxy[i3 + 2] = rad * Math.cos(phi);
    }

    // Split arrays
    const ornEnd = ornamentCount * 3;
    
    return {
        ornaments: {
            pTree: pTree.slice(0, ornEnd),
            pGalaxy: pGalaxy.slice(0, ornEnd),
            scales: scales.slice(0, ornamentCount)
        },
        candies: {
            pTree: pTree.slice(ornEnd),
            pGalaxy: pGalaxy.slice(ornEnd),
            scales: scales.slice(ornamentCount)
        }
    };
  }, [ornamentCount, candyCount]);
};

// -------------------------------------------------------------
// Component: Ornaments (Solid Shiny Balls)
// -------------------------------------------------------------
const OrnamentGroup: React.FC<{ 
    data: { pTree: Float32Array, pGalaxy: Float32Array, scales: Float32Array },
    count: number 
}> = ({ data, count }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const mode = useStore((state) => state.mode);
  
  // Simulation State
  const currentPositions = useRef(new Float32Array(data.pTree)); 
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Colors
  const colors = useMemo(() => {
    const palette = [
      new THREE.Color('#ff007f'), // Hot Pink
      new THREE.Color('#00ced1'), // Dark Turquoise
      new THREE.Color('#ffd700'), // Gold
      new THREE.Color('#c30000'), // Red
      new THREE.Color('#ffffff'), // Silver
      new THREE.Color('#9400d3'), // Violet
    ];
    const cArray = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const col = palette[Math.floor(Math.random() * palette.length)];
      cArray[i * 3] = col.r;
      cArray[i * 3 + 1] = col.g;
      cArray[i * 3 + 2] = col.b;
    }
    return cArray;
  }, [count]);

  useEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        meshRef.current.setColorAt(i, new THREE.Color(colors[i*3], colors[i*3+1], colors[i*3+2]));
      }
      meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [count, colors]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const target = mode === 'GALAXY' ? data.pGalaxy : data.pTree;
    const lerpSpeed = 2.0 * delta;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Interpolate
      currentPositions.current[i3] += (target[i3] - currentPositions.current[i3]) * lerpSpeed;
      currentPositions.current[i3+1] += (target[i3+1] - currentPositions.current[i3+1]) * lerpSpeed;
      currentPositions.current[i3+2] += (target[i3+2] - currentPositions.current[i3+2]) * lerpSpeed;

      dummy.position.set(
        currentPositions.current[i3],
        currentPositions.current[i3+1],
        currentPositions.current[i3+2]
      );

      dummy.rotation.set(state.clock.elapsedTime * 0.2 + i, i, 0);
      
      const s = data.scales[i];
      dummy.scale.set(s, s, s);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshPhysicalMaterial 
        roughness={0.15} 
        metalness={0.6} 
        clearcoat={1.0} 
        clearcoatRoughness={0.1}
        color="#ffffff"
      />
    </instancedMesh>
  );
};

// -------------------------------------------------------------
// Component: Candies (Striped Balls)
// -------------------------------------------------------------
const CandyGroup: React.FC<{ 
    data: { pTree: Float32Array, pGalaxy: Float32Array, scales: Float32Array },
    count: number 
}> = ({ data, count }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const mode = useStore((state) => state.mode);
  const texture = useMemo(() => generateCandyTexture(), []);
  
  const currentPositions = useRef(new Float32Array(data.pTree));
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const target = mode === 'GALAXY' ? data.pGalaxy : data.pTree;
    const lerpSpeed = 1.8 * delta;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      currentPositions.current[i3] += (target[i3] - currentPositions.current[i3]) * lerpSpeed;
      currentPositions.current[i3+1] += (target[i3+1] - currentPositions.current[i3+1]) * lerpSpeed;
      currentPositions.current[i3+2] += (target[i3+2] - currentPositions.current[i3+2]) * lerpSpeed;

      dummy.position.set(
        currentPositions.current[i3],
        currentPositions.current[i3+1],
        currentPositions.current[i3+2]
      );
      dummy.rotation.set(state.clock.elapsedTime, state.clock.elapsedTime * 0.5, i);
      const s = data.scales[i];
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial 
        map={texture} 
        roughness={0.3} 
        metalness={0.1} 
      />
    </instancedMesh>
  );
};

// -------------------------------------------------------------
// Component: Glowing Star Top (5-Edged Star)
// -------------------------------------------------------------
const StarTop: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const mode = useStore((state) => state.mode);

  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.5;
    const innerRadius = 0.6;
    const points = 5;

    // Start at top point
    // Note: THREE.Shape standard orientation is usually XY plane.
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2; // -PI/2 to start at top
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius; // In 2D shape, this is Y. When extruded it becomes Z usually unless rotated.
      
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, []);

  const extrudeSettings = useMemo(() => ({
    steps: 1,
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 2
  }), []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Rotate the star
    groupRef.current.rotation.y += delta * 0.5;
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;

    // Movement logic
    // Tree Mode: Top of tree (15) - Raised from 12 to 15 to avoid sliding in
    // Galaxy Mode: Center (0) to act as a core
    const targetPos = mode === 'GALAXY' ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0, 15, 0);
    // SHRINK in Galaxy mode instead of growing so it doesn't block the photos
    const targetS = mode === 'GALAXY' ? 0.2 : 1.5; 

    groupRef.current.position.lerp(targetPos, delta * 1.5);
    
    // Smooth scale
    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, targetS, delta * 1.0);
    groupRef.current.scale.set(s, s, s);
  });

  return (
    <group ref={groupRef} position={[0, 15, 0]}>
        <mesh rotation={[0, 0, Math.PI]}> {/* Rotate to stand upright if needed, depending on cam */}
            <extrudeGeometry args={[starShape, extrudeSettings]} />
            <meshStandardMaterial 
              color="#ffd700" 
              emissive="#ffaa00" 
              emissiveIntensity={3} 
              roughness={0.1}
              metalness={0.8}
              toneMapped={false} 
            />
        </mesh>
        
        {/* Light Emitter */}
        <pointLight intensity={5} distance={20} color="#ffaa00" decay={2} />
    </group>
  );
};

// -------------------------------------------------------------
// Component: Glow (Background Dust)
// -------------------------------------------------------------
const GlowGroup: React.FC<{ count: number }> = ({ count }) => {
    const points = useRef<THREE.Points>(null);
    const mode = useStore((state) => state.mode);
    
    // We can generate these randomly, no need for collision packing
    const { positions, pGalaxy } = useMemo(() => {
        const p = new Float32Array(count * 3);
        const pg = new Float32Array(count * 3);
        for(let i=0; i<count; i++) {
            const h = Math.random();
            const y = (h - 0.5) * TREE_HEIGHT;
            const r = Math.random() * (1-h) * (TREE_RADIUS_BASE + 2); // Slightly wider than tree
            const a = Math.random() * Math.PI * 2;
            p[i*3] = Math.cos(a)*r; p[i*3+1]=y; p[i*3+2]=Math.sin(a)*r;

            // Galaxy
            const phi = Math.acos(2 * Math.random() - 1);
            const theta = Math.random() * Math.PI * 2;
            const rad = GALAXY_RADIUS * Math.cbrt(Math.random());
            pg[i*3] = rad * Math.sin(phi) * Math.cos(theta);
            pg[i*3+1] = rad * Math.sin(phi) * Math.sin(theta);
            pg[i*3+2] = rad * Math.cos(phi);
        }
        return { positions: p, pGalaxy: pg };
    }, [count]);

    const texture = useMemo(() => {
        const c = document.createElement('canvas');
        c.width = 32; c.height = 32;
        const ctx = c.getContext('2d');
        if(ctx) {
            const g = ctx.createRadialGradient(16,16,0,16,16,16);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0,0,32,32);
        }
        return new THREE.CanvasTexture(c);
    }, []);

    useFrame((state, delta) => {
        if (!points.current) return;
        const posAttr = points.current.geometry.attributes.position;
        const arr = posAttr.array as Float32Array;
        const target = mode === 'GALAXY' ? pGalaxy : positions;
        
        for(let i=0; i<count*3; i++) {
            arr[i] += (target[i] - arr[i]) * 2.5 * delta;
        }
        posAttr.needsUpdate = true;
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={new Float32Array(positions)} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial map={texture} size={0.5} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
    )
}

const MagicParticles: React.FC = () => {
  // Generate unified positions for ornaments + candies
  // Previous: 450 + 150 = 600
  // Reduced by 20%: 360 + 120 = 480
  // Reduced by another 20%: 288 + 96 = 384
  const ornamentCount = 288;
  const candyCount = 96;
  const { ornaments, candies } = usePackingLogic(ornamentCount, candyCount);

  return (
    <group>
      <StarTop />
      <OrnamentGroup count={ornamentCount} data={ornaments} />
      <CandyGroup count={candyCount} data={candies} />
      <GlowGroup count={200} />
    </group>
  );
};

export default MagicParticles;
