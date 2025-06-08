#!/bin/bash

echo "📊 查看服务状态..."
echo ""

# 检查本地开发环境
if docker compose ps -q > /dev/null 2>&1; then
    echo "🔧 本地开发环境:"
    docker compose ps
    echo ""
fi

# 检查生产环境
if docker compose -f docker-compose.prod.yml ps -q > /dev/null 2>&1; then
    echo "🚀 生产环境:"
    docker compose -f docker-compose.prod.yml ps
fi