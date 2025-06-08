# 基础镜像
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo pnpm

# Pruner 阶段
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune --scope=vite --docker

# 依赖安装阶段
FROM base AS installer
WORKDIR /app

# 复制裁剪后的 package.json 文件
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# 安装依赖
RUN pnpm install --frozen-lockfile

# 开发阶段
FROM installer AS development
WORKDIR /app

# 复制裁剪后的完整源码
COPY --from=pruner /app/out/full/ .

# 暴露端口
EXPOSE 5173

# 开发模式启动命令
CMD ["turbo", "run", "dev", "--filter=vite"]

# 构建阶段
FROM installer AS builder
WORKDIR /app

# 复制裁剪后的完整源码
COPY --from=pruner /app/out/full/ .

# 构建应用
RUN turbo run build --filter=vite

# 生产阶段 - 使用nginx
FROM nginx:alpine AS production

# 复制构建产物
COPY --from=builder /app/apps/vite/dist /usr/share/nginx/html

# 复制nginx配置
COPY apps/vite/nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]