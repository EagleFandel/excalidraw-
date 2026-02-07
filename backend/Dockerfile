FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json yarn.lock ./
COPY backend/package.json backend/package.json

RUN yarn --frozen-lockfile

FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY . .

RUN yarn --cwd backend prisma:generate
RUN yarn --cwd backend build

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/prisma ./backend/prisma

EXPOSE 3005

CMD ["node", "backend/dist/main.js"]

