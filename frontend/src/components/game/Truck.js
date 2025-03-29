import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';

// Player's truck with physics and controls
const Truck = forwardRef(({ controls, onPositionUpdate }, ref) => {
  // Physics body for the truck
  const [truckRef, api] = useBox(() => ({
    mass: 1500,
    position: [0, 1, -2400], // Starting position
    rotation: [0, 0, 0],
    allowSleep: false,
    linearDamping: 0.5,
    angularDamping: 0.5,
  }));
  
  // Refs for truck state
  const velocity = useRef([0, 0, 0]);
  const position = useRef([0, 1, -2400]);
  const rotation = useRef([0, 0, 0]);
  const speed = useRef(0);
  const wheelAngle = useRef(0);
  
  // Subscribe to physics body changes
  useEffect(() => {
    // Get velocity updates
    const unsubVelocity = api.velocity.subscribe(v => {
      velocity.current = v;
      // Calculate speed (magnitude of velocity)
      speed.current = Math.sqrt(v[0] * v[0] + v[2] * v[2]);
    });
    
    // Get position updates
    const unsubPosition = api.position.subscribe(p => {
      position.current = p;
    });
    
    // Get rotation updates
    const unsubRotation = api.rotation.subscribe(r => {
      rotation.current = r;
    });
    
    return () => {
      unsubVelocity();
      unsubPosition();
      unsubRotation();
    };
  }, [api]);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getPosition: () => position.current,
    getRotation: () => rotation.current,
    getSpeed: () => speed.current,
    reset: (newPosition) => {
      api.position.set(...newPosition);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    }
  }));
  
  // Update truck physics based on controls
  useFrame((state, delta) => {
    // Max speed in m/s (about 200 km/h)
    const MAX_SPEED = 55;
    
    // Steering sensitivity
    const STEERING_SENSITIVITY = 0.025;
    const MAX_STEERING_ANGLE = 0.5;
    
    // Acceleration/braking force
    const ACCELERATION = 500;
    const BRAKING = 800;
    
    // Current truck direction (normalized)
    const truckDirection = [
      Math.sin(rotation.current[1]),
      0,
      Math.cos(rotation.current[1])
    ];
    
    // Current speed along truck direction
    const currentSpeed = 
      velocity.current[0] * truckDirection[0] + 
      velocity.current[2] * truckDirection[2];
    
    // Apply controls
    if (controls.forward && currentSpeed < MAX_SPEED) {
      // Accelerate
      api.applyForce([
        truckDirection[0] * ACCELERATION * delta,
        0,
        truckDirection[2] * ACCELERATION * delta
      ], [0, 0, 0]);
    }
    
    if (controls.backward) {
      if (currentSpeed > 0) {
        // Braking
        api.applyForce([
          -truckDirection[0] * BRAKING * delta,
          0,
          -truckDirection[2] * BRAKING * delta
        ], [0, 0, 0]);
      } else if (currentSpeed > -MAX_SPEED * 0.3) {
        // Reverse (slower than forward)
        api.applyForce([
          -truckDirection[0] * ACCELERATION * 0.5 * delta,
          0,
          -truckDirection[2] * ACCELERATION * 0.5 * delta
        ], [0, 0, 0]);
      }
    }
    
    // Apply steering - gradually change wheel angle
    if (controls.left) {
      wheelAngle.current = Math.max(wheelAngle.current - STEERING_SENSITIVITY, -MAX_STEERING_ANGLE);
    } else if (controls.right) {
      wheelAngle.current = Math.min(wheelAngle.current + STEERING_SENSITIVITY, MAX_STEERING_ANGLE);
    } else {
      // Return wheels to center
      wheelAngle.current *= 0.9;
    }
    
    // Apply steering force - stronger at lower speeds
    if (Math.abs(currentSpeed) > 0.5 && (wheelAngle.current !== 0)) {
      // Calculate steering force based on speed
      // Reduce steering effectiveness at high speeds for stability
      const steeringFactor = Math.max(0.2, 1 - Math.abs(currentSpeed) / MAX_SPEED);
      
      // Apply torque for steering
      api.applyTorque([0, wheelAngle.current * steeringFactor * currentSpeed * 40 * delta, 0]);
    }
    
    // Natural slowdown when no input
    if (!controls.forward && !controls.backward) {
      api.applyForce([
        -velocity.current[0] * 0.2,
        0,
        -velocity.current[2] * 0.2
      ], [0, 0, 0]);
    }
    
    // Notify parent component of position/rotation/speed updates
    onPositionUpdate(
      {
        x: position.current[0],
        y: position.current[1],
        z: position.current[2]
      },
      {
        x: rotation.current[0],
        y: rotation.current[1],
        z: rotation.current[2]
      },
      speed.current
    );
  });
  
  return (
    <group ref={truckRef}>
      {/* Truck body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color="#ff3e3e" />
      </mesh>
      
      {/* Truck cab */}
      <mesh castShadow position={[0, 1, -1]}>
        <boxGeometry args={[1.8, 1, 1]} />
        <meshStandardMaterial color="#cc3232" />
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
      <mesh position={[-1, -0.3, -1.5]} rotation={[Math.PI / 2, 0, wheelAngle.current]}>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[1, -0.3, -1.5]} rotation={[Math.PI / 2, 0, wheelAngle.current]}>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
});

export default Truck;
