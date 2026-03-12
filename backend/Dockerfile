FROM node:18-alpine

WORKDIR /app

# Copy manifests first for layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy application source
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
