FROM node:22-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libreoffice-writer \
    libreoffice-calc \
    libvips \
    imagemagick \
    fonts-dejavu \
    fonts-liberation \
    fontconfig \
    ca-certificates \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "dist/main"]
