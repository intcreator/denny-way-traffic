FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

FROM node:20-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM node:20-alpine
COPY ./package.json package-lock.json .env index.ts /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
CMD ["npm", "run", "start"]