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

# Ensure sessions and data directories exist and adjust permissions for non-root node user
RUN mkdir -p /app/sessions /app/data && chown -R node:node /app

# Persist WhatsApp session files and database across restarts
VOLUME ["/app/sessions", "/app/data"]

# Switch to non-root user for security
USER node

# Expose Web Interface & Backend REST API port
EXPOSE 3000

# Healthcheck to verify the backend API & web service is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

# Start unified server hosting Frontend, Super Admin, and Backend API
CMD ["node", "serve.js"]
