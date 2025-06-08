#!/bin/bash

# 生产环境部署脚本
echo "🚀 部署生产环境..."

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "❌ 请先创建 .env 文件"
    echo "可以从 .env.example 复制并修改配置"
    exit 1
fi

# 构建并启动生产环境
docker compose -f docker-compose.prod.yml up --build -d

echo "✅ 生产环境部署完成！"
echo ""
echo "🌐 服务访问地址："
echo "📱 Next.js应用: http://localhost:3000"
echo "⚡ Vite应用: http://localhost:5173"
echo "🔥 API Agent: http://localhost:3001"
echo "🌐 Hono API: http://localhost:3002"
echo "🗄️ PostgreSQL: localhost:5432"
echo "🔴 Redis: localhost:6379"
echo ""
echo "💡 提示: 请在防火墙中开放相应端口"