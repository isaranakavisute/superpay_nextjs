FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# The standalone server reads PORT and HOSTNAME; bind all interfaces inside the container.
ENV PORT=4600
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# output: "standalone" (next.config.ts) bundles the server with only the
# dependencies it needs; static assets are copied alongside it.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Run unprivileged; the node image already ships a `node` user.
USER node

EXPOSE 4600

# Inject at runtime -- no .env is baked into the image:
#   SESSION_SECRET   required; signs login cookies
#   CONSOLE_API_KEY  required; must equal the backend's CONSOLE_API_KEY
#   BACKEND_URL      superpayment API. Its Docker image listens on 4650 (3001 is
#                    only the local dev port), e.g. http://<server-ip>:4650 or
#                    http://superpayment:4650 on a shared Docker network.
#                    Inside a container "localhost" is the container itself.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4600)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
