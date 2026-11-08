#!/usr/bin/env bash
# 一键还原到 2026-10-06 14:26 的《枪林弹雨 V2》版本
# 用法：在 gunfire-v2 目录下执行  bash versions/restore-2026-10-06-1426.sh
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
TS="2026-10-06-1426"
echo "从快照还原 index.html / wrangler.toml ..."
cp "$DIR/versions/index.${TS}.html" "$DIR/index.html"
cp "$DIR/versions/wrangler.${TS}.toml" "$DIR/wrangler.toml"
echo "完成。已还原到 ${TS} 版本（含护甲系统）。"
echo "如需重新部署到线上："
echo "  CLOUDFLARE_API_TOKEN=<你的token> CLOUDFLARE_ACCOUNT_ID=d3eff6b3bb01ad6d6e3e21259ffff48b wrangler pages deploy . --project-name=gunfire-v2"
