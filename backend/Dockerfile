FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl libc6-compat

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts

RUN chmod +x scripts/start.sh \
  && npx prisma generate \
  && npm run build \
  && test -f dist/main.js

EXPOSE 4000

CMD ["/app/scripts/start.sh"]
