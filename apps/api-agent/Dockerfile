# 使用 Debian 镜像, 避免 Alpine 兼容性问题
FROM node:20-slim AS base

# 安装必要的系统依赖
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN npm install -g turbo pnpm

# Pruner 阶段 - 裁剪项目
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune --scope=api-agent --docker

# 依赖安装阶段
FROM base AS installer
WORKDIR /app

# 首先复制裁剪后的 package.json 文件
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# 安装依赖
RUN pnpm install --frozen-lockfile

# 开发阶段
FROM installer AS development
WORKDIR /app

# 复制裁剪后的完整源码
COPY --from=pruner /app/out/full/ .

COPY apps/api-agent/.env.development ./apps/api-agent/.env

# 生成 Prisma 客户端
RUN cd apps/api-agent && pnpm run db:generate

# 添加数据库迁移脚本
RUN echo '#!/bin/sh\n\
set -e\n\
echo "🔄 执行数据库迁移..."\n\
cd /app/apps/api-agent && pnpm run db:deploy\n\
echo "✅ 迁移完成！"\n\
echo "🚀 启动应用..."\n\
exec "$@"' > /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

# 设置环境变量确保NestJS绑定到正确的主机
ENV HOST=0.0.0.0
ENV PORT=3001

# 暴露端口
EXPOSE 3001

# 开发模式启动命令
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["turbo", "run", "dev", "--filter=api-agent"]

# 构建阶段
FROM installer AS builder
WORKDIR /app

# 复制裁剪后的完整源码
COPY --from=pruner /app/out/full/ .

# 生成 Prisma 客户端并构建
RUN cd apps/api-agent && pnpm run db:generate
RUN turbo run build --filter=api-agent

# 生产阶段
FROM node:20-slim AS production
WORKDIR /app

# 生产环境也需要 OpenSSL
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

# 复制必要文件
COPY --from=pruner /app/out/json/package.json ./
COPY --from=pruner /app/out/json/pnpm-lock.yaml ./
COPY --from=pruner /app/out/json/apps/api-agent/package.json ./apps/api-agent/

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 复制构建产物
COPY --from=builder /app/apps/api-agent/dist ./apps/api-agent/dist
COPY --from=builder /app/apps/api-agent/prisma ./apps/api-agent/prisma
COPY --from=builder /app/apps/api-agent/node_modules/.prisma ./apps/api-agent/node_modules/.prisma

# 暴露端口
EXPOSE 3001

# 生产模式启动命令
CMD ["node", "apps/api-agent/dist/main"]