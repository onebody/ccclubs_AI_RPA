#!/bin/bash
# ============================
# 开发模式启动脚本
# 使用 Tauri v2 启动原生桌面应用（Rust + Vue3 前端 + Python FastAPI 后端）
# ============================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "启动 CCC-Browser V3 Tauri 开发环境..."

# 检查 Rust 工具链
if ! command -v cargo &> /dev/null; then
    echo "错误: Rust 未安装。请执行: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# 检查 Python 虚拟环境
VENV_DIR="$PROJECT_DIR/backend/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "警告: Python 虚拟环境未创建，请先运行 setup.sh"
    exit 1
fi

# 启动 Tauri 开发模式（自动启动 Vite 前端 + Rust 后端 + Python sidecar）
echo "启动 Tauri 开发模式..."
cd "$PROJECT_DIR/electron"
npm run tauri:dev

echo ""
echo "=========================================="
echo "  Tauri 开发模式已启动"
echo "  前端开发服务器: http://localhost:5173"
echo "  Python 后端: http://127.0.0.1:8900"
echo "=========================================="
echo ""
echo "按 Ctrl+C 停止所有服务"
