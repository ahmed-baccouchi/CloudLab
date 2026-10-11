# Build v2 - nginx.conf BOM fix
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/frontend/ ./apps/frontend/
RUN npm ci --workspace=@cloudlab/shared-types --workspace=@cloudlab/frontend
RUN npm run build --workspace=@cloudlab/shared-types
RUN npm run build --workspace=@cloudlab/frontend

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
