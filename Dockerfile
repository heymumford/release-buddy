FROM node:22-slim

WORKDIR /app

# Install production dependencies against the committed lockfile.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
