import pytest
import asyncio
import json
import websockets
import os
from fastapi.testclient import TestClient
from server import app, generate_track

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
WS_URL = BACKEND_URL.replace('http', 'ws')

client = TestClient(app)

def test_root():
    response = client.get("/api")
    assert response.status_code == 200
    assert response.json() == {"message": "Truck Racing Game API"}

def test_create_game():
    response = client.post("/api/games")
    assert response.status_code == 200
    data = response.json()
    
    # Verify response structure
    assert "game_id" in data
    assert "player_id" in data
    assert "tracks" in data
    assert len(data["tracks"]) == 10  # 10 laps
    
    # Verify track structure
    track = data["tracks"][0]
    assert "type" in track
    assert "features" in track
    assert "length" in track
    assert "checkpoints" in track
    assert len(track["checkpoints"]) >= 8  # At least 8 checkpoints
    
    return data["game_id"], data["player_id"]

def test_join_game():
    # First create a game
    game_id, host_id = test_create_game()
    
    # Then try to join it
    response = client.get(f"/api/games/{game_id}/join")
    assert response.status_code == 200
    data = response.json()
    
    # Verify response structure
    assert data["game_id"] == game_id
    assert "player_id" in data
    assert data["host_id"] == host_id
    assert "tracks" in data
    assert len(data["tracks"]) == 10
    
    return data["player_id"]

@pytest.mark.asyncio
async def test_websocket_game_flow():
    # Create a game first
    game_id, host_id = test_create_game()
    
    # Join as second player
    guest_id = test_join_game()
    
    # Connect both players via WebSocket
    async with websockets.connect(f"{WS_URL}/api/ws/{game_id}/{host_id}") as host_ws, \
              websockets.connect(f"{WS_URL}/api/ws/{game_id}/{guest_id}") as guest_ws:
        
        # Both players ready up
        await host_ws.send(json.dumps({"type": "player_ready"}))
        await guest_ws.send(json.dumps({"type": "player_ready"}))
        
        # Wait for game start message
        host_msg = json.loads(await host_ws.recv())
        assert host_msg["type"] == "game_start"
        assert "startTime" in host_msg
        
        guest_msg = json.loads(await guest_ws.recv())
        assert guest_msg["type"] == "game_start"
        
        # Simulate some position updates
        position_update = {
            "type": "position_update",
            "position": {"x": 10, "y": 0, "z": 20},
            "rotation": {"x": 0, "y": 0.5, "z": 0},
            "speed": 50
        }
        
        await host_ws.send(json.dumps(position_update))
        
        # Verify opponent receives position update
        update_msg = json.loads(await guest_ws.recv())
        assert update_msg["type"] == "player_position"
        assert update_msg["player_id"] == host_id
        assert update_msg["position"] == position_update["position"]
        
        # Simulate lap completion
        lap_msg = {
            "type": "lap_completed",
            "lap": 1
        }
        
        await host_ws.send(json.dumps(lap_msg))
        
        # Verify opponent receives lap update
        lap_update = json.loads(await guest_ws.recv())
        assert lap_update["type"] == "player_lap"
        assert lap_update["player_id"] == host_id
        assert lap_update["lap"] == 1

def test_track_generation():
    track = generate_track()
    
    # Verify track structure
    assert "type" in track
    assert track["type"] in ["desert", "snow", "forest", "city", "space"]
    
    assert "features" in track
    assert len(track["features"]) >= 2
    assert len(track["features"]) <= 4
    
    assert "length" in track
    assert track["length"] == 5000  # 5km track
    
    assert "checkpoints" in track
    assert len(track["checkpoints"]) >= 8
    assert len(track["checkpoints"]) <= 15
    
    # Verify checkpoint structure
    checkpoint = track["checkpoints"][0]
    assert "id" in checkpoint
    assert "position" in checkpoint
    assert "lateral_offset" in checkpoint
    assert 0 <= checkpoint["position"] <= 5000
    assert -20 <= checkpoint["lateral_offset"] <= 20

if __name__ == "__main__":
    pytest.main([__file__])