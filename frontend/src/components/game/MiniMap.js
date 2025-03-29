import React from 'react';

// Minimap showing player positions and track overview
const MiniMap = ({ playerPosition, opponentPosition, track }) => {
  const mapWidth = 180; // Width of the minimap in pixels
  const mapHeight = 180; // Height of the minimap in pixels
  
  // Calculate positions in the minimap
  const calculateMapPosition = (position) => {
    if (!track || !position) return { x: 50, y: 50 };
    
    // Simplified 2D representation - just using x and z coordinates
    // Normalize to minimap size
    const x = ((position.x + 2500) / 5000) * mapWidth; // Center in map
    const y = ((position.z + 2500) / 5000) * mapHeight; // Center in map
    
    return {
      x: Math.max(10, Math.min(mapWidth - 10, x)),
      y: Math.max(10, Math.min(mapHeight - 10, y))
    };
  };
  
  // Get player and opponent positions on minimap
  const playerMapPos = calculateMapPosition(playerPosition);
  const opponentMapPos = calculateMapPosition(opponentPosition);
  
  // Render checkpoints if track is available
  const renderCheckpoints = () => {
    if (!track || !track.checkpoints) return null;
    
    return track.checkpoints.map((checkpoint, index) => {
      // Convert checkpoint position to minimap coordinates
      const pos = calculateMapPosition({
        x: (checkpoint.position / 5000) * 2500 - 1250 + checkpoint.lateral_offset * 10,
        z: 0
      });
      
      return (
        <div 
          key={index}
          className="minimap-checkpoint"
          style={{
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            position: 'absolute',
            width: '5px',
            height: '5px',
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            borderRadius: '50%'
          }}
        />
      );
    });
  };
  
  return (
    <div 
      className="minimap"
      style={{
        width: `${mapWidth}px`,
        height: `${mapHeight}px`
      }}
    >
      <div className="minimap-label">TRACK</div>
      
      {/* Track outline */}
      <div className="minimap-track"></div>
      
      {/* Checkpoints */}
      {renderCheckpoints()}
      
      {/* Player marker */}
      <div 
        className="minimap-player"
        style={{
          left: `${playerMapPos.x}px`,
          top: `${playerMapPos.y}px`
        }}
      ></div>
      
      {/* Opponent marker */}
      <div 
        className="minimap-opponent"
        style={{
          left: `${opponentMapPos.x}px`,
          top: `${opponentMapPos.y}px`
        }}
      ></div>
    </div>
  );
};

export default MiniMap;
