import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import "./App.css";

// Game components
import HomePage from "./components/HomePage";
import GameLobby from "./components/GameLobby";
import RaceGame from "./components/RaceGame";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [gameId, setGameId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [gameData, setGameData] = useState(null);
  
  useEffect(() => {
    // Check if this is a join URL
    const queryParams = new URLSearchParams(window.location.search);
    const joinGameId = queryParams.get("join");
    
    if (joinGameId) {
      handleJoinGame(joinGameId);
    }
  }, []);
  
  const handleCreateGame = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/games`, {
        method: "POST",
      });
      
      const data = await response.json();
      setGameId(data.game_id);
      setPlayerId(data.player_id);
      setGameData(data);
      
      // Navigate to lobby
      window.history.pushState({}, "", `/lobby?game=${data.game_id}`);
    } catch (error) {
      console.error("Error creating game:", error);
    }
  };
  
  const handleJoinGame = async (id) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/games/${id}/join`);
      
      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }
      
      setGameId(data.game_id);
      setPlayerId(data.player_id);
      setGameData(data);
      
      // Navigate to lobby
      window.history.pushState({}, "", `/lobby?game=${data.game_id}`);
    } catch (error) {
      console.error("Error joining game:", error);
    }
  };
  
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={
              <HomePage 
                onCreateGame={handleCreateGame} 
                onJoinGame={handleJoinGame} 
              />
            } 
          />
          <Route 
            path="/lobby" 
            element={
              <GameLobby 
                gameId={gameId}
                playerId={playerId}
                gameData={gameData}
                backendUrl={BACKEND_URL}
              />
            } 
          />
          <Route 
            path="/game" 
            element={
              <RaceGame 
                gameId={gameId}
                playerId={playerId}
                gameData={gameData}
                backendUrl={BACKEND_URL}
              />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
