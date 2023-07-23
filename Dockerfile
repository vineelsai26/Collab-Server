FROM node:lts-alpine

WORKDIR /usr/src/app

COPY . .

RUN npm install -g pm2
RUN npm install -g pnpm

RUN pnpm install
RUN pnpm run build

EXPOSE 7000
CMD [ "pm2-runtime", "dist/src/server.js" ]
