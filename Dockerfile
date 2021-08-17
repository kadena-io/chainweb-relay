FROM node:16
WORKDIR /app
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm ci --omit=dev
COPY Config.mjs .
COPY src src
CMD [ "node", "src/Main.mjs" ]
