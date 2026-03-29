# Stage 1: Builder (Heavy image with dev dependencies)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install ALL dependencies (including dev tools needed for builds)
RUN npm ci 
COPY . .

# Stage 2: Production (Slim image)
FROM node:18-alpine AS production
WORKDIR /app
# Copy package definitions
COPY package*.json ./
# Install ONLY production dependencies (reduces attack surface and image size)
RUN npm ci --omit=dev
# Copy application code from builder
COPY --from=builder /app/src ./src

# Run as a non-root user for security
USER node
EXPOSE 3001
CMD ["node", "src/server.js"]