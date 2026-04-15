# Dockerfile – backend service
# Use a lightweight Node image
FROM node:20-alpine AS base

WORKDIR /app

# Install production dependencies only (but also copy dev deps for nodemon if needed)
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose the server port (default 4000)
EXPOSE 4000

# Start the server
CMD ["node", "server.js"]
