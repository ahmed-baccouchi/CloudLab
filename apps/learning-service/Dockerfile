FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/learning-service/ ./apps/learning-service/
RUN npm ci --workspace=@cloudlab/shared-types --workspace=@cloudlab/shared-auth --workspace=@cloudlab/learning-service
RUN npm run build --workspace=@cloudlab/shared-types
RUN npm run build --workspace=@cloudlab/shared-auth
RUN npm run build --workspace=@cloudlab/learning-service

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-auth/package.json ./packages/shared-auth/
COPY apps/learning-service/package.json ./apps/learning-service/
RUN npm ci --omit=dev --workspace=@cloudlab/shared-types --workspace=@cloudlab/shared-auth --workspace=@cloudlab/learning-service
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-auth/dist ./packages/shared-auth/dist
COPY --from=builder /app/apps/learning-service/dist ./apps/learning-service/dist
USER node
EXPOSE 4002
CMD ["node", "apps/learning-service/dist/server.js"]
