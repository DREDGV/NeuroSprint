FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend ./

RUN npm run build && npm prune --omit=dev

EXPOSE 3211 3212

CMD ["node", "dist/index.js"]
