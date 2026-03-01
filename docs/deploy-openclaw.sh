#!/bin/bash
# OpenClaw 云服务器一键部署脚本（火山引擎 / 任意 Ubuntu）
# 用法：
#   1. 在下面两行填上你的密钥（不要泄露、不要提交到 Git）
#   2. 上传到服务器后执行： chmod +x deploy-openclaw.sh && ./deploy-openclaw.sh
#   3. 在本机执行： scp ~/.openclaw/openclaw.json root@你的公网IP:~/.openclaw/

# ========== 在这里填你的密钥（必填）==========
GOOGLE_API_KEY=""         # 在此填入你的 Google API Key
TELEGRAM_BOT_TOKEN=""      # 在此填入你的 Telegram Bot Token
# ============================================

set -e
echo "[1/6] 检查 Node.js ..."
if ! command -v node &>/dev/null; then
  echo "      安装 Node.js 22 ..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "[2/6] 安装 OpenClaw ..."
if ! command -v openclaw &>/dev/null; then
  curl -fsSL https://openclaw.ai/install.sh | bash || npm install -g openclaw@latest
fi
openclaw --version

echo "[3/6] 创建配置目录和 .env ..."
mkdir -p ~/.openclaw
cat > ~/.openclaw/.env << EOF
GOOGLE_API_KEY=$GOOGLE_API_KEY
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
EOF
chmod 600 ~/.openclaw/.env

echo "[4/6] 检查密钥是否已填写 ..."
if [ -z "$GOOGLE_API_KEY" ] || [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "      警告：GOOGLE_API_KEY 或 TELEGRAM_BOT_TOKEN 为空！请编辑本脚本填好后重新运行。"
  echo "      或手动执行： nano ~/.openclaw/.env  填入后保存。"
  exit 1
fi

echo "[5/6] 安装网关服务 ..."
openclaw gateway install 2>/dev/null || true

echo "[6/6] 启动网关 ..."
openclaw gateway start 2>/dev/null || openclaw gateway restart 2>/dev/null || nohup npx openclaw gateway > ~/.openclaw/gateway.log 2>&1 &
sleep 2
openclaw gateway status 2>/dev/null || true

echo ""
echo "========== 部署完成 =========="
echo "1. 若你有本机配置，在本机执行（把 IP 换成你的公网 IP）："
echo "   scp ~/.openclaw/openclaw.json root@你的公网IP:~/.openclaw/"
echo "2. 在 Telegram 给机器人发消息测试是否回复。"
echo "3. 查看日志： openclaw logs  或  journalctl -u openclaw-gateway -f"
echo "=========================================="
