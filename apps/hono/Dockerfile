# 基础镜像
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo pnpm

# Pruner 阶段
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune --scope=hono-api --docker

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

# 设置Hono环境变量
ENV HOST=0.0.0.0
ENV PORT=3002

# 暴露端口
EXPOSE 3002

# 开发模式启动命令
CMD ["turbo", "run", "dev", "--filter=hono-api"]

# 构建阶段
FROM installer AS builder
WORKDIR /app

# 复制裁剪后的完整源码
COPY --from=pruner /app/out/full/ .

# 构建应用
RUN turbo run build --filter=hono-api

# 生产阶段
FROM node:20-alpine AS production
WORKDIR /app
RUN npm install -g pnpm

# 复制必要文件
COPY --from=pruner /app/out/json/package.json ./
COPY --from=pruner /app/out/json/pnpm-lock.yaml ./
COPY --from=pruner /app/out/json/apps/hono/package.json ./apps/hono/

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 复制构建产物
COPY --from=builder /app/apps/hono/dist ./apps/hono/dist

# 暴露端口
EXPOSE 3002

# 生产模式启动命令
CMD ["node", "apps/hono/dist/index.js"]