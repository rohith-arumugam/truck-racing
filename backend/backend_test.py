import requests
import pytest
import asyncio
import json
import time
from websockets import connect
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get backend URL from environment
BACKEND_URL = "https://backend-3d-racing-game-vwola.kinsta.app"

class TestRacingGame:
    @pytest.fixture
    def base_url(self):
        return BACKEND_URL

    def test_root_endpoint(self, base_url):
        """Test the root endpoint"""
        response = requests.get(f"{base_url}/api")
        assert response.status_code == 200
        assert "message" in response.json()
        logger.info("Root endpoint test passed")

    def test_create_game(self, base_url):
        """Test creating a new game"""
        response = requests.post(f"{base_url}/api/games")
        data = response.json()
        
        assert response.status_code == 200
        assert "game_id" in data
        assert "player_id" in data
        assert "tracks" in data
        assert len(data["tracks"]) == 10  # Should have 10 tracks for 10 laps
        
        logger.info(f"Game created successfully with ID: {data['game_id']}")
        return data["game_id"], data["player_id"]

    def test_join_game(self, base_url):
        """Test joining an existing game"""
        # First create a game
        game_id, host_id = self.test_create_game(base_url)
        
        # Then try to join it
        response = requests.get(f"{base_url}/api/games/{game_id}/join")
        data = response.json()
        
        assert response.status_code == 200
        assert "game_id" in data
        assert "player_id" in data
        assert "host_id" in data
        assert data["host_id"] == host_id
        assert "tracks" in data
        
        logger.info(f"Successfully joined game {game_id} as player {data['player_id']}")
        return game_id, data["player_id"]

    def test_invalid_game_join(self, base_url):
        """Test joining a non-existent game"""
        response = requests.get(f"{base_url}/api/games/invalid-game-id/join")
        data = response.json()
        
        assert "error" in data
        logger.info("Invalid game join test passed")

    @pytest.mark.asyncio
    async def test_websocket_game_flow(self, base_url):
        """Test the complete game flow using WebSocket"""
        # Create a game first
        game_id, host_id = self.test_create_game(base_url)
        
        # Join as second player
        game_id, guest_id = self.test_join_game(base_url)
        
        # Connect both players via WebSocket
        ws_url = f"{base_url.replace('http', 'ws')}/api/ws/{game_id}"
        
        try:
            # Connect host
            async with connect(f"{ws_url}/{host_id}") as host_ws:
                # Connect guest
                async with connect(f"{ws_url}/{guest_id}") as guest_ws:
                    # Mark both players as ready
                    await host_ws.send(json.dumps({"type": "player_ready"}))
                    await guest_ws.send(json.dumps({"type": "player_ready"}))
                    
                    # Wait for game start message
                    host_msg = await host_ws.recv()
                    guest_msg = await guest_ws.recv()
                    
                    host_data = json.loads(host_msg)
                    guest_data = json.loads(guest_msg)
                    
                    assert host_data["type"] == "game_start"
                    assert guest_data["type"] == "game_start"
                    
                    # Simulate some position updates
                    position_data = {
                        "type": "position_update",
                        "position": {"x": 10, "y": 0, "z": 20},
                        "rotation": {"x": 0, "y": 45, "z": 0},
                        "speed": 50
                    }
                    
                    await host_ws.send(json.dumps(position_data))
                    
                    # Simulate lap completion
                    for lap in range(1, 11):
                        lap_data = {
                            "type": "lap_completed",
                            "lap": lap
                        }
                        await host_ws.send(json.dumps(lap_data))
                        await guest_ws.send(json.dumps(lap_data))
                        
                        # Small delay between laps
                        await asyncio.sleep(0.1)
                    
                    # Wait for game completion message
                    final_msg = await host_ws.recv()
                    final_data = json.loads(final_msg)
                    
                    assert final_data["type"] == "game_completed"
                    
                    logger.info("Full game flow test completed successfully")
                    
        except Exception as e:
            logger.error(f"WebSocket test failed: {str(e)}")
            raise

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
