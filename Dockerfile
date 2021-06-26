FROM node:16
WORKDIR /app
COPY package.json package.json
COPY package-lock.json package-lock.json
# RUN npm ci --only=production
RUN npm install
COPY config.js .
COPY src src
CMD [ "node", "src/main.js" ]
