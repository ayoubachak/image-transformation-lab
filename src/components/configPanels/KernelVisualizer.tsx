import React, { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, PerspectiveCamera } from '@react-three/drei';
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
    
    const absMax = Math.max(Math.abs(min), Math.abs(max));
    
    return { minValue: min, maxValue: max, absMax };
  }, [kernelValues]);

  // Dynamic camera position based on kernel size
  const cameraPosition = useMemo(() => {
    const size = Math.max(kernelValues.length, kernelValues[0]?.length || 0);
    return [size * 1.2, size * 1.5, size * 1.2];
  }, [kernelValues]);
  
  return (
    <div className="w-full h-64 border border-gray-200 rounded-md bg-gray-50">
      <Canvas shadows>
        <PerspectiveCamera 
          makeDefault 
          position={cameraPosition} 
          fov={50}
        />
        <ambientLight intensity={0.7} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={0.8} 
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        
        <KernelMesh 
          kernelValues={kernelValues} 
          minValue={minValue}
          maxValue={maxValue}
          absMax={absMax} 
        />
        
        <OrbitControls 
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2.5}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={false}
        />
        
        {/* Legend */}
        <group position={[kernelValues.length * 0.6, 0, 0]} rotation={[0, -Math.PI/4, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.1]} />
            <meshStandardMaterial color="cyan" />
            <Text position={[1, 0, 0]} fontSize={0.4} color="black">
              Positive Values
            </Text>
          </mesh>
          
          <mesh position={[0, -0.8, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.1]} />
            <meshStandardMaterial color="orange" />
            <Text position={[1, 0, 0]} fontSize={0.4} color="black">
              Negative Values
            </Text>
          </mesh>
        </group>
        
        {/* Grid helper */}
        <gridHelper 
          args={[kernelValues.length * 2.5, kernelValues.length * 2, 'gray', 'lightgray']} 
          position={[0, -0.1, 0]}
        />
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
  const heightScale = 2.5;
  
  return (
    <group position={[0, 0, 0]} rotation={[0, Math.PI / 4, 0]}>
      {kernelValues.map((row, i) =>
        row.map((value, j) => {
          // Normalize position to center the kernel
          const x = j - halfCols;
          const z = i - halfRows;
          
          // Height based on value
          const height = (value / (absMax || 1)) * heightScale;
          
          // Color based on value
          let color;
          if (value > 0) {
            // Blue to cyan for positive values
            const intensity = Math.min(1, value / (maxValue || 1));
            color = new THREE.Color(0.2, 0.6 + intensity * 0.4, 1);
          } else if (value < 0) {
            // Orange to red for negative values
            const intensity = Math.min(1, Math.abs(value) / (Math.abs(minValue) || 1));
            color = new THREE.Color(1, 0.5 - intensity * 0.3, 0);
          } else {
            // Gray for zero
            color = new THREE.Color(0.7, 0.7, 0.7);
          }
          
          return (
            <group key={`${i}-${j}`} position={[x, 0, z]}>
              {/* Base plate */}
              <mesh position={[0, -0.05, 0]} receiveShadow>
                <boxGeometry args={[0.9, 0.02, 0.9]} />
                <meshStandardMaterial color="#e0e0e0" />
              </mesh>
              
              {/* Value column */}
              <mesh 
                position={[0, height/2, 0]} 
                castShadow 
                receiveShadow
              >
                <boxGeometry args={[0.7, Math.abs(height) || 0.02, 0.7]} />
                <meshStandardMaterial 
                  color={color} 
                  metalness={0.1} 
                  roughness={0.8} 
                  emissive={color}
                  emissiveIntensity={0.2}
                />
              </mesh>
              
              {/* Value label */}
              <Text 
                position={[0, Math.max(height, 0) + 0.3, 0]}
                fontSize={0.25}
                color="black"
                anchorX="center"
                anchorY="middle"
              >
                {value.toFixed(2)}
              </Text>
            </group>
          );
        })
      )}
    </group>
  );
}