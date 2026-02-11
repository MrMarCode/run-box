FROM node:22-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

FROM node:22-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      git \
      curl \
      build-essential \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/dist/ dist/
COPY --from=builder /app/node_modules/ node_modules/
COPY --from=builder /app/package.json package.json
RUN mkdir -p /workspace

WORKDIR /workspace

ENV DEFAULT_CWD=/workspace
ENV DEFAULT_TIMEOUT_MS=300000
ENV MAX_OUTPUT_BYTES=10485760
ENV SHUTDOWN_GRACE_MS=5000
ENV PORT=3100
ENV HOST=0.0.0.0

EXPOSE 3100

CMD ["node", "/app/dist/index.js"]
