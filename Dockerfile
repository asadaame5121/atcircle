# Build stage
FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# Runtime stage
FROM node:24-slim AS runtime

WORKDIR /app

# Copy only necessary files
COPY package.json package-lock.json ./
# No native build dependencies needed for node:sqlite
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist
COPY --from=build /app/assets ./assets
COPY lexicons ./lexicons

# Create data directory for SQLite
RUN mkdir -p /data && chown node:node /data

USER node
EXPOSE 8080

CMD ["node", "dist/index.js"]
