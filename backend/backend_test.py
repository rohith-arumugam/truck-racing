import pytest
import asyncio
import websockets
import json
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
    
    # Check required fields
    assert "game_id" in data
    assert "player_id" in data
    assert "tracks" in data
    
    # Validate tracks
    assert len(data["tracks"]) == 10  # 10 laps
    for track in data["tracks"]:
        assert "type" in track
        assert "features" in track
        assert "length" in track
        assert "checkpoints" in track
        assert len(track["checkpoints"]) >= 8  # Min 8 checkpoints

def test_join_game():
    # First create a game
    create_response = client.post("/api/games")
    game_data = create_response.json()
    game_id = game_data["game_id"]
    
    # Try joining the game
    join_response = client.get(f"/api/games/{game_id}/join")
    assert join_response.status_code == 200
    join_data = join_response.json()
    
    # Check required fields
    assert join_data["game_id"] == game_id
    assert "player_id" in join_data
    assert "host_id" in join_data
    assert "tracks" in join_data

def test_join_nonexistent_game():
    response = client.get("/api/games/nonexistent-id/join")
    assert response.status_code == 200  # FastAPI converts all responses to 200
    assert "error" in response.json()
    assert response.json()["error"] == "Game not found"

@pytest.mark.asyncio
async def test_websocket_game_flow():
    # Create a game first
    create_response = client.post("/api/games")
    game_data = create_response.json()
    game_id = game_data["game_id"]
    host_id = game_data["player_id"]
    
    # Join as second player
    join_response = client.get(f"/api/games/{game_id}/join")
    join_data = join_response.json()
    guest_id = join_data["player_id"]
    
    # Connect both players via WebSocket
    async with websockets.connect(f"{WS_URL}/api/ws/{game_id}/{host_id}") as host_ws, \
              websockets.connect(f"{WS_URL}/api/ws/{game_id}/{guest_id}") as guest_ws:
        
        # Both players ready up
        await host_ws.send(json.dumps({"type": "player_ready"}))
        await guest_ws.send(json.dumps({"type": "player_ready"}))
        
        # Wait for game start message
        host_msg = await host_ws.recv()
        host_data = json.loads(host_msg)
        assert host_data["type"] == "game_start"
        
        guest_msg = await guest_ws.recv()
        guest_data = json.loads(guest_msg)
        assert guest_data["type"] == "game_start"
        
        # Test position updates
        test_position = {"x": 10, "y": 0, "z": 20}
        test_rotation = {"x": 0, "y": 45, "z": 0}
        await host_ws.send(json.dumps({
            "type": "position_update",
            "position": test_position,
            "rotation": test_rotation,
            "speed": 50
        }))
        
        # Guest should receive position update
        pos_msg = await guest_ws.recv()
        pos_data = json.loads(pos_msg)
        assert pos_data["type"] == "player_position"
        assert pos_data["position"] == test_position
        assert pos_data["rotation"] == test_rotation
        
        # Test lap completion
        await host_ws.send(json.dumps({
            "type": "lap_completed",
            "lap": 1
        }))
        
        lap_msg = await guest_ws.recv()
        lap_data = json.loads(lap_msg)
        assert lap_data["type"] == "player_lap"
        assert lap_data["lap"] == 1

def test_track_generation():
    track = generate_track()
    assert "type" in track
    assert "features" in track
    assert "length" in track == 5000  # 5km track
    assert "checkpoints" in track
    assert len(track["checkpoints"]) >= 8
    assert len(track["checkpoints"]) <= 15

if __name__ == "__main__":
    pytest.main(["-v", "backend_test.py"])
