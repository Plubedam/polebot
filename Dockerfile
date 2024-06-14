FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install  \
&& npm prune --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
