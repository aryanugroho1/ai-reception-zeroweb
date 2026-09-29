# Multi-stage / lightweight Node.js Alpine base
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Copy package definitions
COPY package.json ./

# Copy all project source code
COPY . .

# Adjust permissions for non-root node user
RUN chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose Web Interface & Admin Portal port
EXPOSE 3000

# Healthcheck to verify the web service is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Start web application server
CMD ["node", "serve.js"]
