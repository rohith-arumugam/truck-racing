import pytest
import requests
import json
import asyncio
import websockets
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
WS_URL = BACKEND_URL.replace('http', 'ws')

class TestInterplanetaryTruckRacing:
    def test_api_root(self):
        """Test the root API endpoint"""
        response = requests.get(f"{BACKEND_URL}/api")
        assert response.status_code == 200
        assert response.json()["message"] == "Truck Racing Game API"

    def test_create_game(self):
        """Test creating a new game"""
        response = requests.post(f"{BACKEND_URL}/api/games")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "game_id" in data
        assert "player_id" in data
        assert "tracks" in data
        
        # Verify tracks data
        assert len(data["tracks"]) == 10  # 10 laps
        for track in data["tracks"]:
            assert "type" in track
            assert "features" in track
            assert "length" in track
            assert "checkpoints" in track
            assert track["length"] == 5000  # 5km track length
        
        return data["game_id"], data["player_id"]

    def test_join_game(self):
        """Test joining an existing game"""
        # First create a game
        game_id, host_id = self.test_create_game()
        
        # Try to join the game
        response = requests.get(f"{BACKEND_URL}/api/games/{game_id}/join")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "game_id" in data
        assert "player_id" in data
        assert "host_id" in data
        assert "tracks" in data
        assert data["game_id"] == game_id
        assert data["host_id"] == host_id
        assert len(data["tracks"]) == 10

    def test_join_nonexistent_game(self):
        """Test joining a game that doesn't exist"""
        response = requests.get(f"{BACKEND_URL}/api/games/nonexistent-id/join")
        assert response.status_code == 200  # API returns 200 with error message
        data = response.json()
        assert "error" in data
        assert data["error"] == "Game not found"

    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """Test WebSocket connection and basic game flow"""
        # Create a game first
        game_id, player_id = self.test_create_game()
        
        # Connect to WebSocket
        uri = f"{WS_URL}/api/ws/{game_id}/{player_id}"
        async with websockets.connect(uri) as websocket:
            # Send ready message
            await websocket.send(json.dumps({"type": "player_ready"}))
            
            # Receive player_joined message
            response = await websocket.recv()
            data = json.loads(response)
            assert data["type"] == "player_joined"
            assert "players" in data
            
            # Send position update
            position = {"x": 10, "y": 0, "z": 20}
            rotation = {"x": 0, "y": 45, "z": 0}
            await websocket.send(json.dumps({
                "type": "position_update",
                "position": position,
                "rotation": rotation,
                "speed": 50
            }))
            
            # Send lap completion
            await websocket.send(json.dumps({
                "type": "lap_completed",
                "lap": 1
            }))

if __name__ == "__main__":
    pytest.main([__file__])