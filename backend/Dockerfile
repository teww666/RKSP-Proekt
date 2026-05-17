# Debian slim — стабильнее Prisma/bcrypt на Railway, чем Alpine musl
FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts

RUN chmod +x scripts/start.sh scripts/start-railway.sh \
  && npx prisma generate \
  && rm -f tsconfig.tsbuildinfo tsconfig.build.tsbuildinfo \
  && npm run build \
  && test -f dist/main.js

ENV NODE_ENV=production
EXPOSE 4000

CMD ["/app/scripts/start-railway.sh"]
