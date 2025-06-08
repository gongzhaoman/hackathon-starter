# 基础镜像
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo pnpm

# Pruner 阶段
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune --scope=next --docker

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

# 设置Next.js环境变量
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 开发模式启动命令
CMD ["turbo", "run", "dev", "--filter=next"]

# 构建阶段
FROM installer AS builder
WORKDIR /app

# 复制裁剪后的完整源码
COPY --from=pruner /app/out/full/ .

# 构建应用
RUN turbo run build --filter=next

# 生产阶段
FROM node:20-alpine AS production
WORKDIR /app

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/apps/next/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/next/.next/static ./apps/next/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/next/public ./apps/next/public

USER nextjs

# 暴露端口
EXPOSE 3000

# 生产模式启动命令
CMD ["node", "apps/next/server.js"]