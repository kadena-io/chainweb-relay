# NOTE that the build context is the root of the package

FROM node:16
WORKDIR /app
COPY package.json package.json
COPY package-lock.json package-lock.json
# RUN npm ci --only=production
RUN npm install
COPY Config.mjs Config.mjs
COPY src src
COPY app-test app-test
CMD [ "node", "./app-test/RunLockups.mjs" ]
