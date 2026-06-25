#!/bin/bash
# ============================
# 项目初始化脚本
# 安装所有依赖：Rust 工具链、Python 虚拟环境、前端 npm 依赖
# ============================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  CCC-Browser V3 - 项目初始化"
echo "  (Tauri v2 原生桌面应用)"
echo "=========================================="

# 1. 检查 / 安装 Rust 工具链
if ! command -v cargo &> /dev/null; then
    echo "[1/5] 安装 Rust 工具链..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "[1/5] Rust 已安装: $(rustc --version)"
fi

# 2. 安装 Tauri CLI
echo "[2/5] 检查 Tauri CLI..."
if ! command -v tauri &> /dev/null; then
    cargo install tauri-cli --version "^2"
else
    echo "Tauri CLI 已安装"
fi

# 3. 检查 Python 虚拟环境
VENV_DIR="$PROJECT_DIR/backend/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "[3/5] 创建 Python 虚拟环境..."
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    pip install -r "$PROJECT_DIR/backend/requirements.txt" -q
else
    echo "[3/5] Python 虚拟环境已存在"
    source "$VENV_DIR/bin/activate"
fi

# 4. 安装 Playwright Chromium
echo "[4/5] 检查 Playwright Chromium..."
python -m playwright install chromium

# 5. 安装前端 npm 依赖
echo "[5/5] 安装前端依赖..."
cd "$PROJECT_DIR/electron"
if [ ! -d "node_modules" ]; then
    npm install
fi

# 6. 复制环境变量文件
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    cp "$PROJECT_DIR/backend/.env.example" "$PROJECT_DIR/backend/.env"
    echo "已创建 backend/.env 配置文件"
fi

echo ""
echo "=========================================="
echo "  初始化完成！"
echo "=========================================="
echo ""
echo "开发模式:  cd electron && npm run tauri:dev"
echo "构建打包:  cd electron && npm run tauri:build"
echo ""
