import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { Environment, Sky, PerspectiveCamera } from '@react-three/drei';

// Game components
import Truck from './game/Truck';
import Track from './game/Track';
import OpponentTruck from './game/OpponentTruck';
import MiniMap from './game/MiniMap';
import GameInstructions from './game/GameInstructions';
import GameHUD from './game/GameHUD';
import GameControls from './game/GameControls';
import GameOver from './game/GameOver';

const RaceGame = ({ gameId, playerId, gameData, backendUrl }) => {
  const [searchParams] = useSearchParams();
  const urlGameId = searchParams.get('game');
  const activeGameId = gameId || urlGameId;
  
  const navigate = useNavigate();
  
  // Game state
  const [socket, setSocket] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [currentLap, setCurrentLap] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [speed, setSpeed] = useState(0);
  const [raceStarted, setRaceStarted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [totalTime, setTotalTime] = useState(0);
  const [lapTime, setLapTime] = useState(0);
  const [lapStartTime, setLapStartTime] = useState(0);
  
  // Opponent data
  const [opponentData, setOpponentData] = useState({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    speed: 0,
    currentLap: 0
  });
  
  // Game controls
  const [controls, setControls] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });
  
  // Refs
  const truckRef = useRef();
  const raceStartTimeRef = useRef(null);
  const animationFrameRef = useRef();
  const lastUpdateTimeRef = useRef(Date.now());
  
  // Connect to the game server via WebSocket
  useEffect(() => {
    if (!activeGameId || !playerId) {
      navigate('/');
      return;
    }
    
    // If we already have game data, set tracks
    if (gameData && gameData.tracks) {
      setTracks(gameData.tracks);
    }
    
    const ws = new WebSocket(`${backendUrl.replace('http', 'ws')}/api/ws/${activeGameId}/${playerId}`);
    
    ws.onopen = () => {
      console.log('Connected to the game server');
      setSocket(ws);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      console.log('Received message:', data);
      
      if (data.type === 'game_start') {
        // Start the race
        raceStartTimeRef.current = Date.now();
        setLapStartTime(Date.now());
        setRaceStarted(true);
        setShowInstructions(false);
      }
      else if (data.type === 'player_position' && data.player_id !== playerId) {
        // Update opponent's position
        setOpponentData({
          ...opponentData,
          position: data.position,
          rotation: data.rotation,
          speed: data.speed
        });
      }
      else if (data.type === 'player_lap' && data.player_id !== playerId) {
        // Update opponent's lap
        setOpponentData({
          ...opponentData,
          currentLap: data.lap
        });
        
        // Check for race completion
        if (data.lap >= 10) {
          // Opponent finished race
          setGameOver(true);
          setWinner(data.player_id);
        }
      }
      else if (data.type === 'player_quit' || data.type === 'player_disconnected') {
        // Player quit or disconnected - other player wins
        if (data.winner_id === playerId) {
          setGameOver(true);
          setWinner(playerId);
        }
      }
      else if (data.type === 'game_completed') {
        // Game complete - show results
        setGameOver(true);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('Disconnected from the game server');
    };
    
    // Set up keyboard event listeners
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        setControls(prev => ({ ...prev, forward: true }));
      }
      if (e.key === 'ArrowDown' || e.key === 's') {
        setControls(prev => ({ ...prev, backward: true }));
      }
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        setControls(prev => ({ ...prev, left: true }));
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        setControls(prev => ({ ...prev, right: true }));
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        setControls(prev => ({ ...prev, forward: false }));
      }
      if (e.key === 'ArrowDown' || e.key === 's') {
        setControls(prev => ({ ...prev, backward: false }));
      }
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        setControls(prev => ({ ...prev, left: false }));
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        setControls(prev => ({ ...prev, right: false }));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Clean up on unmount
    return () => {
      if (ws) {
        ws.close();
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [activeGameId, playerId, backendUrl, navigate, gameData, opponentData]);
  
  // Game update loop
  useEffect(() => {
    if (!raceStarted) return;
    
    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateTimeRef.current) / 1000;
      lastUpdateTimeRef.current = now;
      
      if (raceStartTimeRef.current) {
        // Update total race time
        setTotalTime(Math.floor((now - raceStartTimeRef.current) / 1000));
        
        // Update lap time
        setLapTime(Math.floor((now - lapStartTime) / 1000));
      }
      
      // Update player position based on controls
      if (truckRef.current) {
        // Send position update to server (at a lower rate to avoid flooding)
        if (socket && socket.readyState === WebSocket.OPEN && now % 50 === 0) {
          socket.send(JSON.stringify({
            type: 'position_update',
            position,
            rotation,
            speed
          }));
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [raceStarted, position, rotation, speed, socket, lapStartTime]);
  
  // Handle lap completion
  const handleLapCompleted = () => {
    // Calculate lap time
    const lapEndTime = Date.now();
    const lapDuration = Math.floor((lapEndTime - lapStartTime) / 1000);
    
    // Update lap state
    const newLap = currentLap + 1;
    setCurrentLap(newLap);
    setLapStartTime(lapEndTime);
    
    // Send lap update to server
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'lap_completed',
        lap: newLap,
        lapTime: lapDuration
      }));
    }
    
    // Check for race completion
    if (newLap >= 10) {
      // Race finished
      setGameOver(true);
      setWinner(playerId);
    }
  };
  
  // Handle position updates from the physics component
  const updatePlayerPosition = (newPosition, newRotation, newSpeed) => {
    setPosition(newPosition);
    setRotation(newRotation);
    setSpeed(newSpeed);
  };
  
  // Handle going off track
  const handleOffTrack = () => {
    // Implementation for 5-second penalty and reset to last on-track position
    console.log('Off track!');
    // This will be implemented in the Truck component with physics
  };
  
  // Start race after viewing instructions
  const handleStartRace = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'player_ready' }));
      setShowInstructions(false);
    }
  };
  
  // Return to home page
  const handleReturnHome = () => {
    navigate('/');
  };
  
  return (
    <div className="game-container">
      <div className="canvas-container">
        <Canvas shadows>
          <Suspense fallback={null}>
            <Sky 
              distance={450000} 
              sunPosition={[0, 1, 0]} 
              inclination={0} 
              azimuth={0.25}
            />
            
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[10, 10, 10]}
              intensity={1}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            
            <PerspectiveCamera makeDefault position={[0, 5, -10]} />
            
            <Physics>
              {tracks.length > 0 && currentLap < tracks.length && (
                <Track 
                  track={tracks[currentLap]} 
                  onLapCompleted={handleLapCompleted}
                  onOffTrack={handleOffTrack}
                />
              )}
              
              <Truck 
                ref={truckRef}
                controls={controls}
                onPositionUpdate={updatePlayerPosition}
              />
              
              <OpponentTruck 
                position={opponentData.position}
                rotation={opponentData.rotation}
              />
            </Physics>
            
            <Environment preset="sunset" />
          </Suspense>
        </Canvas>
      </div>
      
      {/* HUD Elements */}
      <GameHUD 
        speed={Math.round(speed * 3.6)} // Convert m/s to km/h
        currentLap={currentLap + 1}
        totalLaps={10}
        totalTime={totalTime}
        lapTime={lapTime}
      />
      
      {/* Minimap */}
      <MiniMap 
        playerPosition={position}
        opponentPosition={opponentData.position}
        track={currentLap < tracks.length ? tracks[currentLap] : null}
      />
      
      {/* Mobile Controls */}
      <GameControls 
        setControls={setControls}
      />
      
      {/* Game Instructions Overlay */}
      {showInstructions && (
        <GameInstructions onStartRace={handleStartRace} />
      )}
      
      {/* Game Over Screen */}
      {gameOver && (
        <GameOver 
          winner={winner === playerId}
          onReturnHome={handleReturnHome}
        />
      )}
    </div>
  );
};

export default RaceGame;
