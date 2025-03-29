import React from 'react';

// Instructions overlay shown before race starts
const GameInstructions = ({ onStartRace }) => {
  return (
    <div className="instructions-overlay">
      <div className="instructions-container">
        <h2 className="instructions-title">Race Instructions</h2>
        
        <div className="instructions-list">
          <div className="instructions-item">
            <strong>Controls:</strong> Use arrow keys or WASD to control your truck. 
            Up/W for acceleration, Down/S for brakes, Left/Right or A/D for steering.
          </div>
          
          <div className="instructions-item">
            <strong>Race Rules:</strong> Complete 10 laps on the randomly generated 
            tracks. Each lap is 5km long.
          </div>
          
          <div className="instructions-item">
            <strong>Off-Track Penalty:</strong> If you go off the track, your truck
            will be stopped and returned to the track after 5 seconds.
          </div>
          
          <div className="instructions-item">
            <strong>Winning:</strong> First player to complete all 10 laps wins.
            If a player quits mid-race, the remaining player is declared the winner.
          </div>
          
          <div className="instructions-item">
            <strong>Screen Display:</strong> The HUD shows your speed, current lap,
            total race time, and current lap time. The minimap shows your position 
            and your opponent's position.
          </div>
        </div>
        
        <button className="start-race-button" onClick={onStartRace}>
          Ready to Race!
        </button>
      </div>
    </div>
  );
};

export default GameInstructions;
