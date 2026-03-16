#!/bin/bash

# 图片风格转换脚本（长连接版本）
# 注意：此 API 需要等待 30-120 秒
# 使用方法:
#   直接运行: ./scripts/image-style-transform.sh
#   使用代理: PROXY=http://127.0.0.1:7890 ./scripts/image-style-transform.sh

API_URL="https://www.runninghub.cn/openapi/v2/rhart-image-n-g31-flash/image-to-image"
API_KEY="ee4739f9078f4879859d5021ef235ea1"
TIMEOUT=180  # 3 分钟超时

# 代理设置（通过环境变量 PROXY 指定，如 http://127.0.0.1:7890）
CURL_PROXY=""
if [ -n "$PROXY" ]; then
  CURL_PROXY="--proxy $PROXY"
  echo "🌐 使用代理: $PROXY"
fi

echo "🎨 开始转换图片..."
echo "⏱️  预计等待时间: 30-120 秒"
echo "   请耐心等待，不要中断..."
echo ""

START_TIME=$(date +%s)

# 使用 curl 的长连接模式，设置超时时间
response=$(curl --location --request POST "$API_URL" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer $API_KEY" \
  --connect-timeout 30 \
  --max-time $TIMEOUT \
  --silent --show-error \
  $CURL_PROXY \
  --data-raw '{
    "imageUrls": [
      "https://www.runninghub.cn/view?filename=174ba2c54b8af1fdd5a01370049dd6407a693d8b05b4717079698e87680e038e.png&type=input&subfolder=&Rh-Comfy-Auth=eyJ1c2VySWQiOiIzZjY1MTNlNWEwNjY1N2I4OGYyNjU5NTEzYmU3ZDM0YyIsInNpZ25FeHBpcmUiOjE3NzI3NjM5NDg5OTQsInRzIjoxNzcyMTU5MTQ4OTk0LCJzaWduIjoiNjAxNWY0MjI2NzI2Yzk0YTFkOTExNjg2NGRkZmU2ZTAifQ==&Rh-Identify=3f6513e5a06657b88f2659513be7d34c&rand=0.8958046627705756"
    ],
    "prompt": "将这张线稿转换为明代水墨武侠风格的精细彩图。严格保留人物的动作轮廓与黑鸦的形态，将背景替换为风雪交加的竹林。增强水墨晕染的纹理感，整体色调偏冷，烘托出肃杀的氛围。",
    "resolution": "1k"
  }')

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "⏰ 耗时: ${ELAPSED} 秒"
echo ""

# 先显示原始响应（调试）
echo "📄 原始响应:"
echo "$response"
echo ""

# 检查是否有 jq
if command -v jq &> /dev/null; then
  echo "📋 格式化 JSON:"
  echo "$response" | jq '.' 2>/dev/null || echo "(无法解析为 JSON)"
else
  echo "(jq 未安装，显示原始响应)"
fi

echo ""

# 检查返回结果
if echo "$response" | grep -q '"code":0'; then
  echo "✅ 转换成功!"
else
  echo "❌ 转换失败，请检查返回信息"
fi
