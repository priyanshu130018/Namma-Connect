# ==============================================================================
# Namma Connect — Frontend Dockerfile (Multi-Stage Build)
# ==============================================================================

# ── 1. Development Stage (Vite Dev Server, Direct Execution) ──
FROM node:20-alpine as development

WORKDIR /app

ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:5173/ || exit 1

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ── 2. Production Build Stage ──
FROM node:20-alpine as builder

WORKDIR /app

ARG VITE_API_URL=/api/v2
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_TOMTOM_API_KEY=""

ENV VITE_API_URL=$VITE_API_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_TOMTOM_API_KEY=$VITE_TOMTOM_API_KEY

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

# ── 3. Production Static Serving Stage (Nginx) ──
FROM nginx:1.27-alpine as production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
