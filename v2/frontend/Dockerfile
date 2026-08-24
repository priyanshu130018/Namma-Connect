# ==============================================================================
# Namma Connect V2 — Frontend Vite/React Dockerfile
# ==============================================================================

FROM node:20-alpine

WORKDIR /app

# Copy package descriptors and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source code
COPY . .

# Expose Vite development server port
EXPOSE 5173

# Default development command with host binding and port preservation
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
