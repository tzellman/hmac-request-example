# you can pass in NODE_VERSION as a --build-arg to override the version - a default is provided
ARG NODE_VERSION=lts
FROM node:${NODE_VERSION} as base

WORKDIR /build
COPY . .
RUN npm install
RUN npm run build

FROM node:${NODE_VERSION} as release
COPY --from=base /build/package.json /app/package.json
COPY --from=base /build/node_modules /app/node_modules
COPY --from=base /build/lib /app/lib
WORKDIR /app
ENTRYPOINT ["node"]
CMD ["lib/client.js"]
