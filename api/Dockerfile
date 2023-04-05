FROM node:18

ENV NODE_ENV production

WORKDIR /usr/src/app

COPY api/package*.json ./
RUN npm install

COPY . .
CMD ["node", "server.js"]