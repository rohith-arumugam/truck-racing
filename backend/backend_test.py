import requests
import asyncio
import websockets
import json
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL')

class TruckRacingGameTester:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.backend_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        logger.info(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                logger.info(f"✅ Passed - Status: {response.status_code}")
                return True, response.json()
            else:
                logger.error(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            logger.error(f"❌ Failed - Error: {str(e)}")
            return False, {}

    async def test_websocket_connection(self, game_id, player_id):
        """Test WebSocket connection and game flow"""
        ws_url = f"{self.backend_url.replace('http', 'ws')}/api/ws/{game_id}/{player_id}"
        
        try:
            async with websockets.connect(ws_url) as websocket:
                logger.info("✅ WebSocket connection established")
                
                # Test player ready message
                ready_msg = json.dumps({"type": "player_ready"})
                await websocket.send(ready_msg)
                logger.info("✅ Sent player ready message")
                
                # Wait for response
                response = await websocket.recv()
                response_data = json.loads(response)
                logger.info(f"✅ Received response: {response_data}")
                
                return True
                
        except Exception as e:
            logger.error(f"❌ WebSocket test failed: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all tests"""
        logger.info("\n🎮 Starting Truck Racing Game API Tests")
        
        # Test root endpoint
        success, _ = self.run_test("Root endpoint", "GET", "", 200)
        if not success:
            return
            
        # Test game creation
        success, create_data = self.run_test("Create game", "POST", "games", 200)
        if not success:
            return
            
        game_id = create_data.get('game_id')
        player1_id = create_data.get('player_id')
        
        if not game_id or not player1_id:
            logger.error("❌ Failed to get game_id or player_id from create response")
            return
            
        # Test joining game
        success, join_data = self.run_test("Join game", "GET", f"games/{game_id}/join", 200)
        if not success:
            return
            
        player2_id = join_data.get('player_id')
        
        if not player2_id:
            logger.error("❌ Failed to get player2_id from join response")
            return
            
        # Test WebSocket connections for both players
        logger.info("\n🔌 Testing WebSocket connections")
        
        ws_success1 = await self.test_websocket_connection(game_id, player1_id)
        ws_success2 = await self.test_websocket_connection(game_id, player2_id)
        
        if ws_success1 and ws_success2:
            self.tests_passed += 2
            logger.info("✅ WebSocket tests passed")
        else:
            logger.error("❌ WebSocket tests failed")
            
        # Print final results
        logger.info(f"\n📊 Tests Summary:")
        logger.info(f"Total tests: {self.tests_run + 2}")  # +2 for WebSocket tests
        logger.info(f"Tests passed: {self.tests_passed}")
        success_rate = (self.tests_passed / (self.tests_run + 2)) * 100
        logger.info(f"Success rate: {success_rate:.2f}%")

if __name__ == "__main__":
    tester = TruckRacingGameTester()
    asyncio.run(tester.run_all_tests())