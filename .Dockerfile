# Use a Node.js base image for the frontend

FROM node:18 as frontend-builder

# Set working directory for frontend

WORKDIR /app/frontend

# Copy frontend package.json and package-lock.json

COPY frontend/package*.json ./

# Install frontend dependencies

RUN yarn install

# Copy frontend source code

COPY frontend/ ./

# Create a production build of the frontend

# Note: Environment variables will be applied at build time

RUN yarn build

# Use Python base image for the backend

FROM python:3.10-slim

# Set working directory

WORKDIR /app

# Install Node.js for serving the frontend

RUN apt-get update && apt-get install -y \

curl \

gnupg \

&& curl -sL https://deb.nodesource.com/setup_18.x | bash - \

&& apt-get install -y nodejs \

&& apt-get clean \

&& rm -rf /var/lib/apt/lists/*

# Install serve globally

RUN npm install -g serve

# Copy backend requirements file

COPY backend/requirements.txt ./backend/

# Install backend dependencies

RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code

COPY backend/ ./backend/

# Copy built frontend from the frontend-builder stage

COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Expose the port Render will use

# Render assigns a PORT environment variable

EXPOSE 10000

# Create an entrypoint script that starts both services using Render's PORT

RUN echo '#!/bin/bash\n\

# Start the backend server in the background\n\

cd /app/backend && python server.py &\n\

# Start the frontend server - use port from Render\n\

cd /app && serve -s frontend/build -l ${PORT:-10000}\n\

' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Set the entrypoint

ENTRYPOINT ["/app/entrypoint.sh"]