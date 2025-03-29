import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const GameLobby = ({ gameId, playerId, gameData, backendUrl }) => {
  const [searchParams] = useSearchParams();
  const urlGameId = searchParams.get('game');
  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState({});
  const [isReady, setIsReady] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const navigate = useNavigate();
  
  // Use URL param if gameId prop is not available
  const activeGameId = gameId || urlGameId;
  
  useEffect(() => {
    if (!activeGameId) {
      navigate('/');
      return;
    }
    
    // Connect to WebSocket server for real-time game updates
    const ws = new WebSocket(`${backendUrl.replace('http', 'ws')}/api/ws/${activeGameId}/${playerId}`);
    
    ws.onopen = () => {
      console.log('Connected to the game server');
      setSocket(ws);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      console.log('Received message:', data);
      
      if (data.type === 'player_joined') {
        setPlayers(data.players);
      } else if (data.type === 'game_start') {
        // Game is starting, redirect to game screen
        navigate(`/game?game=${activeGameId}`);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('Disconnected from the game server');
    };
    
    // Clean up on unmount
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [activeGameId, playerId, backendUrl, navigate]);
  
  // If we have gameData, initialize the players state
  useEffect(() => {
    if (gameData && gameData.players) {
      setPlayers(gameData.players);
    }
  }, [gameData]);
  
  const handleReadyClick = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      setIsReady(true);
      socket.send(JSON.stringify({ type: 'player_ready' }));
    }
  };
  
  const copyGameLink = () => {
    const gameLink = `${window.location.origin}/?join=${activeGameId}`;
    navigator.clipboard.writeText(gameLink)
      .then(() => {
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
      });
  };
  
  // Check if we have 2 players
  const hasOpponent = Object.keys(players).length >= 2;
  
  return (
    <div className="lobby-container">
      <h1 className="lobby-title">Game Lobby</h1>
      
      <div className="lobby-info">
        <h2 className="lobby-info-title">Invite a Friend</h2>
        <div className="lobby-link">
          {`${window.location.origin}/?join=${activeGameId}`}
          <button className="copy-button" onClick={copyGameLink}>
            {copySuccess || 'Copy'}
          </button>
        </div>
        <p>Share this link with your friend to join the race!</p>
      </div>
      
      <div className="player-status">
        <div className={`player-card ${isReady ? 'ready' : ''}`}>
          <h3 className="player-card-title">You</h3>
          <p className={`player-card-status ${isReady ? 'ready' : ''}`}>
            {isReady ? 'Ready' : 'Not Ready'}
          </p>
        </div>
        
        {hasOpponent ? (
          <div className={`player-card ${Object.values(players).find(p => p.id !== playerId)?.ready ? 'ready' : ''}`}>
            <h3 className="player-card-title">Opponent</h3>
            <p className={`player-card-status ${Object.values(players).find(p => p.id !== playerId)?.ready ? 'ready' : ''}`}>
              {Object.values(players).find(p => p.id !== playerId)?.ready ? 'Ready' : 'Not Ready'}
            </p>
          </div>
        ) : (
          <div className="player-card">
            <h3 className="player-card-title">Waiting...</h3>
            <p className="player-card-status">No Opponent Yet</p>
          </div>
        )}
      </div>
      
      {!hasOpponent && (
        <p className="waiting-message">Waiting for opponent to join...</p>
      )}
      
      <button 
        onClick={handleReadyClick} 
        className={`ready-button ${isReady ? 'ready' : ''}`}
        disabled={isReady}
      >
        {isReady ? "Ready!" : "Ready Up"}
      </button>
    </div>
  );
};

export default GameLobby;
