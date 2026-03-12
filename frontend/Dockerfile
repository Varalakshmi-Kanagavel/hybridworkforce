# ---- Stage 1: Build ----
FROM node:18-alpine AS builder

WORKDIR /app

# VITE_API_URL is baked at build time by Vite (import.meta.env)
ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
# Use npm install (project uses bun.lockb, no package-lock.json)
RUN npm install

COPY . .
RUN npm run build

# ---- Stage 2: Serve ----
FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
