import React, { useState } from 'react';

const HomePage = ({ onCreateGame, onJoinGame }) => {
  const [gameIdInput, setGameIdInput] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  
  const handleJoinClick = () => {
    setShowJoinForm(true);
  };
  
  const handleJoinGame = () => {
    if (gameIdInput.trim()) {
      onJoinGame(gameIdInput.trim());
    }
  };
  
  return (
    <div className="home-container">
      <h1 className="home-title">Interplanetary Truck Racing</h1>
      <p className="home-subtitle">
        Race your futuristic truck across alien planets in this multiplayer
        racing game. Challenge your friends and compete across 10 laps of
        randomly generated tracks!
      </p>
      
      <div className="home-buttons">
        <button onClick={onCreateGame} className="home-button primary">
          Create New Game
        </button>
        <button onClick={handleJoinClick} className="home-button">
          Join Existing Game
        </button>
      </div>
      
      {showJoinForm && (
        <div className="join-game-container">
          <input
            type="text"
            className="join-game-input"
            placeholder="Enter Game ID"
            value={gameIdInput}
            onChange={(e) => setGameIdInput(e.target.value)}
          />
          <button onClick={handleJoinGame} className="home-button">
            Join Game
          </button>
        </div>
      )}
    </div>
  );
};

export default HomePage;
