import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, PerspectiveCamera, useTexture, Float } from '@react-three/drei';
import * as THREE from 'three';

interface KernelVisualizerProps {
  kernelValues: number[][];
}

export default function KernelVisualizer({ kernelValues }: KernelVisualizerProps) {
  // Calculate min/max for color scaling
  const { minValue, maxValue, absMax } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    
    kernelValues.forEach(row => {
      row.forEach(value => {
        min = Math.min(min, value);
        max = Math.max(max, value);
      });
    });
    
    const absMax = Math.max(Math.abs(min), Math.abs(max), 0.0001); // Avoid division by zero
    
    return { minValue: min, maxValue: max, absMax };
  }, [kernelValues]);

  // Dynamic camera position based on kernel size
  const cameraPosition: [number, number, number] = useMemo(() => {
    const size = Math.max(kernelValues.length, kernelValues[0]?.length || 0);
    return [size * 1.2, size * 1.5, size * 1.2];
  }, [kernelValues]);
  
  return (
    <div className="w-full h-72 border border-gray-200 rounded-md bg-gradient-to-b from-gray-50 to-gray-100 shadow-inner overflow-hidden">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera 
          makeDefault 
          position={cameraPosition} 
          fov={50}
          near={0.1}
          far={1000}
        />
        <color attach="background" args={['#f8fafc']} />
        <fog attach="fog" args={['#f8fafc', 20, 30]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={0.8} 
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <directionalLight position={[-10, -10, -5]} intensity={0.4} />
        <spotLight position={[0, 10, 0]} intensity={0.3} angle={0.3} penumbra={1} castShadow />
        
        <KernelMesh 
          kernelValues={kernelValues} 
          minValue={minValue}
          maxValue={maxValue}
          absMax={absMax} 
        />
        
        <OrbitControls 
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2.1}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={true}
          autoRotateSpeed={0.5}
          zoomSpeed={0.8}
          dampingFactor={0.1}
        />
        
        {/* Legend with floating animation */}
        <group position={[kernelValues.length * 0.8, 0, kernelValues.length * 0.5]}>
          <Float speed={2} rotationIntensity={0} floatIntensity={0.2}>
            <group rotation={[0, -Math.PI/3, 0]}>
              <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.6, 0.2, 0.1]} />
                <meshStandardMaterial color="#22d3ee" metalness={0.2} roughness={0.3} />
              </mesh>
              <Text 
                position={[1.2, 0, 0]} 
                fontSize={0.3}
                color="#0f172a"
                anchorX="left"
                outlineWidth={0.01}
                outlineColor="#ffffff"
              >
                Positive Values
              </Text>
              
              <mesh position={[0, -0.8, 0]} castShadow>
                <boxGeometry args={[0.6, 0.2, 0.1]} />
                <meshStandardMaterial color="#fb923c" metalness={0.2} roughness={0.3} />
              </mesh>
              <Text 
                position={[1.2, -0.8, 0]} 
                fontSize={0.3}
                color="#0f172a"
                anchorX="left"
                outlineWidth={0.01}
                outlineColor="#ffffff"
              >
                Negative Values
              </Text>
            </group>
          </Float>
        </group>
        
        {/* Grid helper */}
        <gridHelper 
          args={[kernelValues.length * 3, kernelValues.length * 3, '#94a3b8', '#cbd5e1']} 
          position={[0, -0.01, 0]}
        />
        
        {/* Base plate */}
        <mesh 
          position={[0, -0.05, 0]} 
          rotation={[-Math.PI / 2, 0, 0]} 
          receiveShadow
        >
          <planeGeometry args={[kernelValues.length * 3, kernelValues.length * 3]} />
          <meshStandardMaterial 
            color="#f1f5f9"
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>
      </Canvas>
    </div>
  );
}

function KernelMesh({ 
  kernelValues, 
  minValue, 
  maxValue, 
  absMax 
}: {
  kernelValues: number[][];
  minValue: number;
  maxValue: number;
  absMax: number;
}) {
  const rows = kernelValues.length;
  const cols = kernelValues[0]?.length || 0;
  const halfRows = (rows - 1) / 2;
  const halfCols = (cols - 1) / 2;
  
  // Scale factor for height
  const heightScale = 2;
  
  // Create a reusable material for performance
  const positiveMaterial = useRef(new THREE.MeshStandardMaterial({
    metalness: 0.2,
    roughness: 0.3,
  }));
  
  const negativeMaterial = useRef(new THREE.MeshStandardMaterial({
    metalness: 0.2,
    roughness: 0.3,
  }));
  
  const zeroMaterial = useRef(new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.7, 0.7, 0.7),
    metalness: 0.1,
    roughness: 0.8,
  }));
  
  // Animation reference
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Add subtle floating animation
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.03;
    }
  });
  
  return (
    <group position={[0, 0, 0]} rotation={[0, Math.PI / 4, 0]} ref={groupRef}>
      {kernelValues.map((row, i) =>
        row.map((value, j) => {
          // Normalize position to center the kernel
          const x = j - halfCols;
          const z = i - halfRows;
          
          // Height based on value
          const height = (value / (absMax || 1)) * heightScale;
          
          // Is this the center cell?
          const isCenter = i === Math.floor(rows/2) && j === Math.floor(cols/2);
          
          // Color based on value
          let material;
          if (value > 0) {
            // Blue to cyan gradient for positive values
            const intensity = Math.min(1, value / (maxValue || 1));
            const hue = 0.55 + intensity * 0.1; // From blue to cyan
            const saturation = 0.7 + intensity * 0.3;
            const lightness = 0.6 + intensity * 0.2;
            
            positiveMaterial.current.color.setHSL(hue, saturation, lightness);
            positiveMaterial.current.emissive.setHSL(hue, saturation, lightness * 0.2);
            material = positiveMaterial.current;
          } else if (value < 0) {
            // Orange to red gradient for negative values
            const intensity = Math.min(1, Math.abs(value) / (Math.abs(minValue) || 1));
            const hue = 0.05 - intensity * 0.05; // From orange to red
            const saturation = 0.7 + intensity * 0.3;
            const lightness = 0.6 - intensity * 0.2;
            
            negativeMaterial.current.color.setHSL(hue, saturation, lightness);
            negativeMaterial.current.emissive.setHSL(hue, saturation, lightness * 0.2);
            material = negativeMaterial.current;
          } else {
            // Gray for zero
            material = zeroMaterial.current;
          }
          
          // Animate with subtle delay based on position
          const delay = (i * cols + j) * 0.05;
          
          return (
            <group key={`${i}-${j}`} position={[x, 0, z]}>
              {/* Base plate with highlight for center */}
              <mesh position={[0, -0.05, 0]} receiveShadow>
                <boxGeometry args={[0.9, 0.02, 0.9]} />
                <meshStandardMaterial 
                  color={isCenter ? "#bae6fd" : "#e0e0e0"}
                />
              </mesh>
              
              {/* Value column - using rounded shape for positive values */}
              <mesh 
                position={[0, height/2, 0]} 
                castShadow 
                receiveShadow
              >
                {value !== 0 ? (
                  height > 0 ? (
                    <cylinderGeometry args={[0.3, 0.4, Math.abs(height) || 0.02, 16]} />
                  ) : (
                    <cylinderGeometry args={[0.4, 0.3, Math.abs(height) || 0.02, 16]} />
                  )
                ) : (
                  <boxGeometry args={[0.7, 0.02, 0.7]} />
                )}
                <primitive object={material} />
              </mesh>
              
              {/* Value label with better positioning and readability */}
              <Float speed={2} rotationIntensity={0} floatIntensity={0.1}>
                <Text 
                  position={[0, Math.max(height, 0) + 0.3, 0]}
                  fontSize={0.22}
                  color="#0f172a"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.02}
                  outlineColor="#ffffff"
                >
                  {isCenter ? `${value.toFixed(2)} (center)` : value.toFixed(2)}
                </Text>
              </Float>
            </group>
          );
        })
      )}
    </group>
  );
}