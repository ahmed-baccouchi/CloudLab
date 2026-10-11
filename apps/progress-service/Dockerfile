FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/progress-service/ ./apps/progress-service/
RUN npm ci --workspace=@cloudlab/shared-types --workspace=@cloudlab/shared-auth --workspace=@cloudlab/progress-service
RUN npm run build --workspace=@cloudlab/shared-types
RUN npm run build --workspace=@cloudlab/shared-auth
RUN npm run build --workspace=@cloudlab/progress-service

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-auth/package.json ./packages/shared-auth/
COPY apps/progress-service/package.json ./apps/progress-service/
RUN npm ci --omit=dev --workspace=@cloudlab/shared-types --workspace=@cloudlab/shared-auth --workspace=@cloudlab/progress-service
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-auth/dist ./packages/shared-auth/dist
COPY --from=builder /app/apps/progress-service/dist ./apps/progress-service/dist
USER node
EXPOSE 4004
CMD ["node", "apps/progress-service/dist/server.js"]
