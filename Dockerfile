# Multi-stage / lightweight Node.js Alpine base
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Copy package definitions
COPY package*.json ./

# Install production dependencies (@whiskeysockets/baileys, qrcode, pino)
RUN npm install --omit=dev

# Copy all project source code & backend modules
COPY . .

# Ensure sessions and data directories exist with full read/write access
RUN mkdir -p /app/sessions /app/data && chmod -R 777 /app/sessions /app/data

# Sessions and database are mounted via docker-compose host volumes (./sessions, ./data)

# Expose Web Interface & Backend REST API port
EXPOSE 3000

# Healthcheck to verify the backend API & web service is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

# Start unified server hosting Frontend, Super Admin, and Backend API
CMD ["node", "serve.js"]
