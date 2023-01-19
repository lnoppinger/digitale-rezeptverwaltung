FROM node:14

COPY package*.json ./

RUN npm install && nmp audit fix

COPY . ./

EXPOSE 3000

CMD ["npm", "run", "start"]
