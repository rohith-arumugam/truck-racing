import React from 'react';

// Game over screen shown after race completion
const GameOver = ({ winner, onReturnHome }) => {
  return (
    <div className="game-over-overlay">
      <div className="game-over-container">
        <h2 className="game-over-title">
          {winner ? 'Victory!' : 'Race Complete!'}
        </h2>
        
        <p className="game-over-subtitle">
          {winner 
            ? 'Congratulations! You won the race!' 
            : 'Your opponent finished first, better luck next time!'}
        </p>
        
        <button className="game-over-button" onClick={onReturnHome}>
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default GameOver;
