FROM node:20-alpine AS base
WORKDIR /app

# bcrypt требует нативной сборки на Alpine
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY nest-cli.json tsconfig*.json ./
COPY src ./src

RUN npx prisma generate && npm run build

EXPOSE 4000

# migrate обязателен; seed — только для демо, не валит старт при повторном деплое
CMD [ "/bin/sh", "-c", "set -eu; npx prisma migrate deploy; npx prisma db seed || true; node dist/main.js" ]
