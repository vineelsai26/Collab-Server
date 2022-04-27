FROM node:lts-alpine

WORKDIR /usr/src/app

COPY . .

RUN yarn install
RUN npm install -g pm2

EXPOSE 7000
CMD [ "pm2-runtime", "server.js" ]