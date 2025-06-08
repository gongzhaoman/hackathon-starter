#!/bin/bash

echo "🛑 停止服务..."

# 选择停止哪个环境
echo "请选择要停止的环境:"
echo "1) 本地开发环境"
echo "2) 生产环境"
echo "3) 全部"
read -p "请输入选项 (1-3): " choice

case $choice in
    1)
        echo "停止本地开发环境..."
        docker compose down
        ;;
    2)
        echo "停止生产环境..."
        docker compose -f docker-compose.prod.yml down
        ;;
    3)
        echo "停止所有环境..."
        docker compose down
        docker compose -f docker-compose.prod.yml down
        ;;
    *)
        echo "无效选项"
        exit 1
        ;;
esac

echo "✅ 服务已停止"