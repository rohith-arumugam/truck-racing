from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import uvicorn
import os
import logging
import uuid
import json
import random
import asyncio
from pathlib import Path

# /backend 
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Game state
active_games = {}
connections = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections = {}
    
    async def connect(self, websocket: WebSocket, game_id: str, player_id: str):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = {}
        self.active_connections[game_id][player_id] = websocket
        
    def disconnect(self, game_id: str, player_id: str):
        if game_id in self.active_connections and player_id in self.active_connections[game_id]:
            del self.active_connections[game_id][player_id]
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]
    
    async def send_personal_message(self, message: dict, game_id: str, player_id: str):
        if game_id in self.active_connections and player_id in self.active_connections[game_id]:
            await self.active_connections[game_id][player_id].send_json(message)
    
    async def broadcast(self, message: dict, game_id: str):
        if game_id in self.active_connections:
            for connection in self.active_connections[game_id].values():
                await connection.send_json(message)

manager = ConnectionManager()

# Function to generate random track
def generate_track():
    track_types = ["desert", "snow", "forest", "city", "space"]
    track_features = ["jumps", "hairpins", "obstacles", "ramps", "tunnels"]
    
    # Random selection of track elements
    track_type = random.choice(track_types)
    features = random.sample(track_features, k=random.randint(2, 4))
    
    # Generate random checkpoint positions along a 5km track
    num_checkpoints = random.randint(8, 15)
    checkpoints = []
    
    for i in range(num_checkpoints):
        # Each checkpoint has a position along the track (0-5000 meters)
        position = (i * 5000 / num_checkpoints) + random.randint(-100, 100)
        position = max(0, min(5000, position))  # Keep within track bounds
        
        # Add some random offset for left/right position
        lateral_offset = random.randint(-20, 20)
        
        checkpoints.append({
            "id": i,
            "position": position,
            "lateral_offset": lateral_offset
        })
    
    return {
        "type": track_type,
        "features": features,
        "length": 5000,  # 5km
        "checkpoints": checkpoints
    }

# Root route
@app.get("/api")
async def root():
    return {"message": "Truck Racing Game API"}

# Create a new game
@app.post("/api/games")
async def create_game():
    game_id = str(uuid.uuid4())
    host_id = str(uuid.uuid4())
    
    # Create tracks for all 10 laps
    tracks = [generate_track() for _ in range(10)]
    
    # Store game state
    game_data = {
        "id": game_id,
        "host_id": host_id,
        "status": "waiting",
        "players": {
            host_id: {
                "id": host_id,
                "position": {"x": 0, "y": 0, "z": 0},
                "rotation": {"x": 0, "y": 0, "z": 0},
                "currentLap": 0,
                "checkpoints": [],
                "speed": 0,
                "ready": False
            }
        },
        "tracks": tracks,
        "startTime": None,
        "created_at": None
    }
    
    active_games[game_id] = game_data
    
    # Save to database
    await db.games.insert_one(game_data)
    
    return {
        "game_id": game_id,
        "player_id": host_id,
        "tracks": tracks
    }

# Join an existing game
@app.get("/api/games/{game_id}/join")
async def join_game(game_id: str):
    if game_id not in active_games:
        # Try to load from database
        game_data = await db.games.find_one({"id": game_id})
        if game_data:
            active_games[game_id] = game_data
        else:
            return {"error": "Game not found"}
    
    game = active_games[game_id]
    
    if game["status"] != "waiting":
        return {"error": "Game already started"}
    
    # Create guest player
    guest_id = str(uuid.uuid4())
    
    # Add guest to game
    game["players"][guest_id] = {
        "id": guest_id,
        "position": {"x": 0, "y": 0, "z": 0},
        "rotation": {"x": 0, "y": 0, "z": 0},
        "currentLap": 0,
        "checkpoints": [],
        "speed": 0,
        "ready": False
    }
    
    # Update in database
    await db.games.update_one(
        {"id": game_id},
        {"$set": {"players": game["players"]}}
    )
    
    return {
        "game_id": game_id,
        "player_id": guest_id,
        "host_id": game["host_id"],
        "tracks": game["tracks"]
    }

@app.websocket("/api/ws/{game_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str, player_id: str):
    await manager.connect(websocket, game_id, player_id)
    
    try:
        # Check if game exists
        if game_id not in active_games:
            # Try to load from database
            game_data = await db.games.find_one({"id": game_id})
            if game_data:
                active_games[game_id] = game_data
            else:
                await manager.send_personal_message(
                    {"type": "error", "message": "Game not found"},
                    game_id, player_id
                )
                return
        
        game = active_games[game_id]
        
        # Update player's connection
        await manager.broadcast(
            {
                "type": "player_joined",
                "player_id": player_id,
                "players": game["players"]
            },
            game_id
        )
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "player_ready":
                game["players"][player_id]["ready"] = True
                
                # Check if all players are ready
                all_ready = all(player["ready"] for player in game["players"].values())
                
                if all_ready and len(game["players"]) >= 2:
                    # Start the game
                    game["status"] = "racing"
                    game["startTime"] = asyncio.get_event_loop().time()
                    
                    # Update in database
                    await db.games.update_one(
                        {"id": game_id},
                        {"$set": {"status": "racing", "startTime": game["startTime"]}}
                    )
                    
                    # Broadcast game start
                    await manager.broadcast(
                        {"type": "game_start", "startTime": game["startTime"]},
                        game_id
                    )
            
            elif message["type"] == "position_update":
                # Update player position
                game["players"][player_id]["position"] = message["position"]
                game["players"][player_id]["rotation"] = message["rotation"]
                game["players"][player_id]["speed"] = message["speed"]
                
                # Broadcast to all other players
                await manager.broadcast(
                    {
                        "type": "player_position",
                        "player_id": player_id,
                        "position": message["position"],
                        "rotation": message["rotation"],
                        "speed": message["speed"]
                    },
                    game_id
                )
            
            elif message["type"] == "lap_completed":
                current_lap = message["lap"]
                game["players"][player_id]["currentLap"] = current_lap
                
                # Broadcast lap completion
                await manager.broadcast(
                    {
                        "type": "player_lap",
                        "player_id": player_id,
                        "lap": current_lap
                    },
                    game_id
                )
                
                # Check for race completion (10 laps)
                if current_lap >= 10:
                    # Player finished the race
                    finished_players = sum(1 for p in game["players"].values() if p.get("currentLap", 0) >= 10)
                    
                    # If all players finished, end the game
                    if finished_players == len(game["players"]):
                        game["status"] = "completed"
                        await db.games.update_one(
                            {"id": game_id},
                            {"$set": {"status": "completed"}}
                        )
                        
                        await manager.broadcast(
                            {"type": "game_completed"},
                            game_id
                        )
            
            elif message["type"] == "player_quit":
                # Player quitting midway
                # Determine the other player is the winner
                other_players = [pid for pid in game["players"].keys() if pid != player_id]
                
                if other_players:
                    winner_id = other_players[0]
                    await manager.broadcast(
                        {
                            "type": "player_quit", 
                            "player_id": player_id,
                            "winner_id": winner_id
                        },
                        game_id
                    )
            
            # Update game state in memory
            active_games[game_id] = game
    
    except WebSocketDisconnect:
        manager.disconnect(game_id, player_id)
        
        if game_id in active_games:
            # Player disconnected midway - other player wins
            game = active_games[game_id]
            other_players = [pid for pid in game["players"].keys() if pid != player_id]
            
            if other_players:
                winner_id = other_players[0]
                await manager.broadcast(
                    {
                        "type": "player_disconnected", 
                        "player_id": player_id,
                        "winner_id": winner_id
                    },
                    game_id
                )
    
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
        manager.disconnect(game_id, player_id)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True)
