import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

// Opponent truck model that follows server position updates
const OpponentTruck = ({ position, rotation }) => {
  const group = useRef();
  
  // Load truck model
  const truckModel = {
    // This is a simplified placeholder - we'd use useGLTF for a real model
    // Example: const { nodes, materials } = useGLTF('/models/truck.glb')
  };
  
  // Update position smoothly
  useFrame(() => {
    if (group.current) {
      // Smooth interpolation to opponent position
      group.current.position.x = group.current.position.x + (position.x - group.current.position.x) * 0.1;
      group.current.position.y = group.current.position.y + (position.y - group.current.position.y) * 0.1;
      group.current.position.z = group.current.position.z + (position.z - group.current.position.z) * 0.1;
      
      // Smooth interpolation to opponent rotation
      group.current.rotation.x = group.current.rotation.x + (rotation.x - group.current.rotation.x) * 0.1;
      group.current.rotation.y = group.current.rotation.y + (rotation.y - group.current.rotation.y) * 0.1;
      group.current.rotation.z = group.current.rotation.z + (rotation.z - group.current.rotation.z) * 0.1;
    }
  });
  
  return (
    <group ref={group} position={[position.x, position.y, position.z]}>
      {/* In a real implementation, we'd render the actual truck model */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color="#00f7ff" />
      </mesh>
      
      {/* Truck cab */}
      <mesh castShadow position={[0, 1, -1]}>
        <boxGeometry args={[1.8, 1, 1]} />
        <meshStandardMaterial color="#00d0d7" />
      </mesh>
      
      {/* Truck wheels */}
      <mesh position={[-1, -0.3, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[1, -0.3, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[-1, -0.3, -1.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[1, -0.3, -1.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
};

export default OpponentTruck;
