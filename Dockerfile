FROM node:11

WORKDIR /usr/src/app

COPY . .
RUN npm install -g
