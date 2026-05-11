FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma
COPY nest-cli.json tsconfig*.json ./
COPY src ./src

RUN npx prisma generate && npm run build

EXPOSE 4000

CMD [ "/bin/sh", "-c", "set -eu; npx prisma migrate deploy && npx prisma db seed && node dist/main.js" ]
