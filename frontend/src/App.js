import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useSearchParams, useNavigate } from "react-router-dom";
import "./App.css";

// Game components
import HomePage from "./components/HomePage";
import GameLobby from "./components/GameLobby";
import RaceGame from "./components/RaceGame";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Wrapper component to handle URL parameters
function GameLobbyWrapper() {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get("game");
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [playerId, setPlayerId] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!gameId) {
      navigate("/");
      return;
    }

    // Try to load player data from localStorage if it exists for this game
    const storedPlayerId = localStorage.getItem(`playerId_${gameId}`);
    
    if (storedPlayerId) {
      console.log("Found stored player ID:", storedPlayerId);
      setPlayerId(storedPlayerId);
      setIsLoading(false);
      return;
    }

    // If no stored player ID, join the game
    console.log("Joining game with ID:", gameId);
    fetch(`${BACKEND_URL}/api/games/${gameId}/join`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setTimeout(() => navigate("/"), 2000);
        } else {
          // Save the player ID and game data
          localStorage.setItem(`playerId_${gameId}`, data.player_id);
          setPlayerId(data.player_id);
          setGameData(data);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error joining game:", err);
        setError("Error connecting to game server");
        setIsLoading(false);
        setTimeout(() => navigate("/"), 2000);
      });
  }, [gameId, navigate]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Connecting to game...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <p>Error: {error}</p>
        <p>Redirecting to home...</p>
      </div>
    );
  }

  if (!playerId) {
    return <Navigate to="/" />;
  }

  return (
    <GameLobby
      gameId={gameId}
      playerId={playerId}
      gameData={gameData}
      backendUrl={BACKEND_URL}
    />
  );
}

// Wrapper component for RaceGame
function RaceGameWrapper() {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get("game");
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [playerId, setPlayerId] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!gameId) {
      navigate("/");
      return;
    }

    // Try to load player data from localStorage
    const storedPlayerId = localStorage.getItem(`playerId_${gameId}`);
    
    if (storedPlayerId) {
      console.log("Found stored player ID for game:", storedPlayerId);
      setPlayerId(storedPlayerId);
      setIsLoading(false);
      return;
    }

    // If we get here, we don't have player data - redirect to lobby
    navigate(`/lobby?game=${gameId}`);
  }, [gameId, navigate]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Preparing race...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <p>Error: {error}</p>
        <p>Redirecting to home...</p>
      </div>
    );
  }

  if (!playerId) {
    return <Navigate to="/" />;
  }

  return (
    <RaceGame
      gameId={gameId}
      playerId={playerId}
      gameData={gameData}
      backendUrl={BACKEND_URL}
    />
  );
}

function App() {
  const handleCreateGame = async () => {
    try {
      console.log("Creating new game...");
      const response = await fetch(`${BACKEND_URL}/api/games`, {
        method: "POST",
      });
      
      const data = await response.json();
      console.log("Game created:", data);
      
      // Store player ID in localStorage
      localStorage.setItem(`playerId_${data.game_id}`, data.player_id);
      
      // Navigate to lobby with the game ID
      window.location.href = `/lobby?game=${data.game_id}`;
    } catch (error) {
      console.error("Error creating game:", error);
      alert("Error creating game. Please try again.");
    }
  };
  
  const handleJoinGame = async (id) => {
    if (!id) {
      alert("Please enter a valid Game ID");
      return;
    }
    
    console.log("Joining game:", id);
    window.location.href = `/lobby?game=${id}`;
  };
  
  // Check if this is a join URL on the home page
  useEffect(() => {
    if (window.location.pathname === "/") {
      const queryParams = new URLSearchParams(window.location.search);
      const joinGameId = queryParams.get("join");
      
      if (joinGameId) {
        console.log("Join URL detected, redirecting to lobby...");
        window.location.href = `/lobby?game=${joinGameId}`;
      }
    }
  }, []);
  
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
          <Route path="/lobby" element={<GameLobbyWrapper />} />
          <Route path="/game" element={<RaceGameWrapper />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
