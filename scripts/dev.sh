#!/bin/bash

# 本地开发环境启动脚本
echo "🚀 启动本地开发环境..."

# 构建并启动所有服务
docker-compose watch

echo "✅ 所有服务已启动！"
echo "📱 Next.js: http://localhost:3000"
echo "⚡ Vite: http://localhost:5173"
echo "🔥 API Agent: http://localhost:3001"
echo "🌐 Hono API: http://localhost:3002"
echo "🗄️ PostgreSQL: localhost:5432"
echo "🔴 Redis: localhost:6379"