FROM node:16-alpine

WORKDIR /app
RUN apk update && apk add --no-cache docker-cli
COPY ["package.json", "yarn.lock", "./"]
RUN yarn install
COPY . .
CMD ["yarn", "start"]
