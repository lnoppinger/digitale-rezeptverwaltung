FROM node:22

COPY package.json ./

RUN npm install

COPY . ./

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD [ "curl", "-f", "http://localhost:80/ping" ]

CMD ["npm", "run", "start"]