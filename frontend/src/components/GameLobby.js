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
  
  // Since we're using the wrapper, we should have both gameId and playerId
  useEffect(() => {
    if (!gameId || !playerId) {
      console.error("Missing gameId or playerId in GameLobby:", { gameId, playerId });
      navigate('/');
      return;
    }
    
    console.log("Attempting WebSocket connection with:", {
      backendUrl,
      gameId,
      playerId
    });
    
    // Connect to WebSocket server for real-time game updates
    // Use a try-catch to handle potential WebSocket initialization errors
    try {
      const wsUrl = `${backendUrl.replace(/^http/, 'ws')}/api/ws/${activeGameId}/${playerId}`;
      console.log("Connecting to WebSocket URL:", wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Successfully connected to the game server');
        setSocket(ws);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          
          if (data.type === 'player_joined') {
            console.log('New player joined:', data);
            setPlayers(data.players);
          } else if (data.type === 'game_start') {
            console.log('Game starting!');
            // Game is starting, redirect to game screen
            navigate(`/game?game=${activeGameId}`);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, event.data);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
    
    // Clean up on unmount
    return () => {
      if (socket) {
        socket.close();
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
