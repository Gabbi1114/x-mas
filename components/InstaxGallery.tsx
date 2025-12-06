
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';

// Tree Constants matching MagicParticles
const TREE_HEIGHT = 22;
// Synced to MagicParticles TREE_RADIUS_BASE
const TREE_BASE_RADIUS = 10; 

const PHOTO_COUNT = 10;

// Helper: Generate a placeholder memory texture
const generatePhotoTexture = (index: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // Background Gradient
    const grd = ctx.createLinearGradient(0, 0, 512, 512);
    // Varied colors for each photo
    const hue = (index * 45) % 360; 
    grd.addColorStop(0, `hsl(${hue}, 60%, 80%)`);
    grd.addColorStop(1, `hsl(${hue + 40}, 50%, 60%)`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 512, 512);

    // Some simple shapes/art
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(256, 256, 150, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 80px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`MOMENT`, 256, 200);
    ctx.font = 'bold 180px Arial';
    ctx.fillText(`${index + 1}`, 256, 320);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
};

// Frame-rate independent damp helper
const damp = (current: number, target: number, lambda: number, delta: number) => {
    return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta));
};

const InstaxFrame: React.FC<{ 
  texture: THREE.Texture; 
  treePos: THREE.Vector3;
  treeRot: THREE.Euler;
  galaxyPos: THREE.Vector3;
  index: number;
}> = ({ texture, treePos, treeRot, galaxyPos, index }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Group>(null);
  const mode = useStore((state) => state.mode);
  
  // View Mode Logic
  const viewMode = useStore((state) => state.viewMode);
  const activeMediaIndex = useStore((state) => state.activeMediaIndex);
  const isActive = viewMode && activeMediaIndex === index;
  
  // Camera ref for "Head-Locked" view
  const { camera } = useThree();

  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return;

    const isGalaxy = mode === 'GALAXY';
    let targetPos = isGalaxy ? galaxyPos : treePos;
    let targetScale = isGalaxy ? 1.5 : 0.8; 
    
    // OVERRIDE: If Active View Mode in Galaxy
    if (isGalaxy && isActive) {
        // Position directly in front of camera in World Space
        const vec = new THREE.Vector3(0, 0, -10); // 10 units in front
        vec.applyMatrix4(camera.matrixWorld);

        // Correction: Convert World Position to Local Position relative to parent (SceneContent)
        // This ensures that even if SceneContent is rotated (or frozen at a rotation),
        // the polaroid will be visually centered in front of the camera.
        if (groupRef.current?.parent) {
             groupRef.current.parent.worldToLocal(vec);
        }

        targetPos = vec;
        targetScale = 1.3; // Reduced scale to fit mobile screens vertically and horizontally
    }

    const lambda = 4.0; 

    // 1. Damp Position
    groupRef.current.position.lerp(targetPos, 1 - Math.exp(-lambda * delta));
    
    // 2. Damp Scale
    const currentScale = groupRef.current.scale.x;
    const s = damp(currentScale, targetScale, lambda, delta);
    groupRef.current.scale.set(s, s, s);

    // 3. Rotation Logic
    if (isGalaxy) {
        if (isActive) {
            // Lock rotation to camera orientation so it's always flat facing user
            groupRef.current.quaternion.slerp(camera.quaternion, 1 - Math.exp(-lambda * delta));
        } else {
            // Look at camera generally in world space
            groupRef.current.lookAt(state.camera.position);
        }
    } else {
        // Align with tree surface in Tree mode
        const targetQuaternion = new THREE.Quaternion().setFromEuler(treeRot);
        groupRef.current.quaternion.slerp(targetQuaternion, 1 - Math.exp(-lambda * delta));
    }

    // 4. Floating Animation
    if (isGalaxy && !isActive) {
        // Galaxy float logic (disable if being viewed)
        const t = state.clock.elapsedTime;
        meshRef.current.position.y = Math.sin(t * 1.5 + index) * 0.5;
        meshRef.current.rotation.z = Math.sin(t * 1 + index) * 0.05;
    } else {
        // Tree mode or Active View: Lock perfectly still relative to anchor
        meshRef.current.position.y = damp(meshRef.current.position.y, 0, lambda, delta);
        meshRef.current.rotation.z = damp(meshRef.current.rotation.z, 0, lambda, delta);
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={meshRef}> 
        {/* Drop Shadow Plane */}
        <mesh position={[0.1, -0.1, -0.05]} rotation={[0,0,0]}>
             <planeGeometry args={[3.6, 4.3]} />
             <meshBasicMaterial color="#000000" transparent opacity={0.3} />
        </mesh>

        {/* Polaroid Frame Geometry */}
        <mesh position={[0, 0, 0]}>
            <RoundedBox args={[3.5, 4.2, 0.05]} radius={0.05} smoothness={4}>
                <meshStandardMaterial 
                    color="#ffffff" 
                    emissive="#eeeeee"
                    emissiveIntensity={0.2}
                    roughness={0.8} 
                    metalness={0.1} 
                />
            </RoundedBox>
        </mesh>
        
        {/* Image Area */}
        <mesh position={[0, 0.25, 0.05]}>
            <planeGeometry args={[3.1, 3.1]} />
            <meshBasicMaterial map={texture} />
        </mesh>
        
        {/* Black Backing */}
        <mesh position={[0, 0.25, 0.03]}>
             <planeGeometry args={[3.1, 3.1]} />
             <meshBasicMaterial color="#111" />
        </mesh>
        
        {/* Text Label */}
        <group position={[0, -1.6, 0.04]}>
             <Text
                fontSize={0.2}
                color="rgba(50,50,50,0.6)"
                anchorX="center"
                anchorY="middle"
                letterSpacing={0.1}
             >
                2026 MEMORY
             </Text>
        </group>

        {/* String Decoration - Only in Tree Mode */}
        {mode === 'TREE' && (
            <group position={[0, 2.15, -0.05]}>
                 <mesh>
                    <torusGeometry args={[0.08, 0.02, 8, 16]} />
                    <meshStandardMaterial color="#dddddd" roughness={0.4} />
                 </mesh>
                 <mesh position={[0, 0.5, 0]}>
                    <cylinderGeometry args={[0.015, 0.015, 1.0]} />
                    <meshStandardMaterial color="#dddddd" roughness={0.4} />
                 </mesh>
            </group>
        )}
      </group>
    </group>
  );
};

const InstaxGallery: React.FC = () => {
  // Store Access
  const gesture = useStore(state => state.gesture);
  const mode = useStore(state => state.mode);
  const viewMode = useStore(state => state.viewMode);
  const setViewMode = useStore(state => state.setViewMode);
  const activeMediaIndex = useStore(state => state.activeMediaIndex);
  const setActiveMediaIndex = useStore(state => state.setActiveMediaIndex);
  
  const switchCooldown = useRef<number>(0);

  // Gesture Logic for Interaction
  useFrame((state) => {
      // Only processing specific gestures in GALAXY mode
      if (mode !== 'GALAXY') return;

      const now = state.clock.elapsedTime;

      // 1. VICTORY -> Pick / View
      if (gesture === 'VICTORY' && !viewMode) {
          setViewMode(true);
      }

      // 2. OPEN_PALM -> Exit / Release
      if (gesture === 'OPEN_PALM' && viewMode) {
          setViewMode(false);
      }

      // 3. THREE_FINGERS -> Next Photo (Debounced)
      if (gesture === 'THREE_FINGERS' && viewMode) {
          if (now - switchCooldown.current > 0.8) { // 0.8s wait between switches
              setActiveMediaIndex((activeMediaIndex + 1) % PHOTO_COUNT);
              switchCooldown.current = now;
          }
      }
  });

  // Generate Textures instantly (no loading wait)
  const frames = useMemo(() => {
    const coneSlope = Math.atan(TREE_BASE_RADIUS / TREE_HEIGHT);
    const galaxyPositions: THREE.Vector3[] = [];
    const heightStep = 3.2; 
    const radius = 6.0; 
    const angleStep = 2.2; 

    return Array.from({ length: PHOTO_COUNT }).map((_, i) => {
        const texture = generatePhotoTexture(i);

        // Tree
        const t = i / PHOTO_COUNT; 
        const height = TREE_HEIGHT * (0.8 - t * 0.8); 
        const yTree = height - TREE_HEIGHT / 2 + 2; 
        const radiusTree = (1 - (height / TREE_HEIGHT)) * TREE_BASE_RADIUS + 0.2; 
        const angleTree = i * 2.4; 

        const tx = Math.cos(angleTree) * radiusTree;
        const tz = Math.sin(angleTree) * radiusTree;
        const treePos = new THREE.Vector3(tx, yTree, tz);
        const treeRot = new THREE.Euler(-coneSlope, -angleTree + Math.PI / 2, 0, 'YXZ');

        // Galaxy
        let galaxyPos = new THREE.Vector3();
        let valid = false;
        let attempts = 0;
        
        while (!valid && attempts < 50) {
            const spiralY = (i - (PHOTO_COUNT - 1) / 2) * heightStep; 
            const spiralAngle = i * angleStep + (attempts * 0.5); 
            
            const gx = Math.cos(spiralAngle) * radius + (Math.random() - 0.5) * 1.5;
            const gz = Math.sin(spiralAngle) * radius + 4 + (Math.random() * 2);
            const gy = spiralY + (Math.random() - 0.5) * 1.0;

            galaxyPos.set(gx, gy, gz);
            let collision = false;
            for (const existing of galaxyPositions) {
                if (existing.distanceTo(galaxyPos) < 4.5) {
                    collision = true;
                    break;
                }
            }
            if (!collision) valid = true;
            attempts++;
        }
        
        if (!valid) {
             const spiralY = (i - (PHOTO_COUNT - 1) / 2) * heightStep;
             galaxyPos.set(4, spiralY, 8); 
        }
        galaxyPositions.push(galaxyPos);

        return { texture, treePos, treeRot, galaxyPos, index: i };
    });
  }, []);

  return (
    <group>
      {frames.map((f, i) => (
          <InstaxFrame
            key={i}
            texture={f.texture}
            treePos={f.treePos}
            treeRot={f.treeRot}
            galaxyPos={f.galaxyPos}
            index={f.index}
          />
      ))}
    </group>
  );
};

export default InstaxGallery;

