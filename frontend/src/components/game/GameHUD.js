import React from 'react';

// Heads-up display for game information
const GameHUD = ({ speed, currentLap, totalLaps, totalTime, lapTime }) => {
  // Format time as minutes:seconds
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  return (
    <div className="game-hud">
      <div className="hud-top">
        <div className="hud-panel">
          <div className="hud-panel-title">SPEED</div>
          <div className="hud-panel-value">{speed} km/h</div>
        </div>
        
        <div className="hud-panel">
          <div className="hud-panel-title">LAP</div>
          <div className="hud-panel-value">{currentLap} / {totalLaps}</div>
        </div>
      </div>
      
      <div className="hud-bottom">
        <div className="hud-panel">
          <div className="hud-panel-title">TOTAL TIME</div>
          <div className="hud-panel-value">{formatTime(totalTime)}</div>
        </div>
        
        <div className="hud-panel">
          <div className="hud-panel-title">LAP TIME</div>
          <div className="hud-panel-value">{formatTime(lapTime)}</div>
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
