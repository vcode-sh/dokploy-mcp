FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-slim AS run

WORKDIR /app

ENV NODE_ENV=production
ENV DOKPLOY_MCP_TRANSPORT=http
ENV DOKPLOY_MCP_HTTP_HOST=0.0.0.0
ENV DOKPLOY_MCP_HTTP_PORT=3000
ENV DOKPLOY_MCP_HTTP_PATH=/mcp
ENV DOKPLOY_MCP_HEALTH_PATH=/health

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/server.json ./server.json

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then((r)=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "dist/index.js", "serve-http"]
