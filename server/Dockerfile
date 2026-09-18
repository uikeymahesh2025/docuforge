FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm install -D typescript @types/node @types/express @types/cors @types/multer
RUN npm run build
RUN npm prune --production

EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "dist/index.js"]
