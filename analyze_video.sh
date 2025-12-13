#!/bin/bash

# GLM 视频分析脚本
# 用法: ./analyze_video.sh <本地视频文件路径>

# 配置
API_KEY="5af04f2db8324883994e49e29697981c.tbtrKoVUOeFwdti6"
API_BASE="https://open.bigmodel.cn/api/paas/v4"
MODEL="glm-4.6v"

# 分析提示词
PROMPT="分析视频，拆分视频成合适的片段，以表格化的方式返回结果镜头拆分结果，要包括：序号、景别、拍摄方案、开始时间、结束时间、口播文案、视频内容"

# 检查参数
if [ -z "$1" ]; then
  echo "用法: $0 <视频文件路径>"
  echo "示例: $0 ./test.mp4"
  exit 1
fi

VIDEO_FILE="$1"

# 检查文件是否存在
if [ ! -f "$VIDEO_FILE" ]; then
  echo "❌ 文件不存在: $VIDEO_FILE"
  exit 1
fi

echo "🎬 GLM 视频分析脚本"
echo "📁 视频文件: $VIDEO_FILE"
echo ""

# 步骤1: 上传文件
echo "📤 正在上传文件..."
UPLOAD_RESPONSE=$(curl -s -X POST "$API_BASE/files" \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@$VIDEO_FILE" \
  -F "purpose=agent")

echo "上传响应: $UPLOAD_RESPONSE"

# 提取文件 ID
FILE_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$FILE_ID" ]; then
  echo "❌ 文件上传失败"
  exit 1
fi

echo "✅ 文件上传成功，ID: $FILE_ID"
echo ""

# 步骤2: 调用视频分析
echo "🔍 正在分析视频..."
curl -X POST "$API_BASE/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'"$MODEL"'",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "file",
            "file": {
              "file_id": "'"$FILE_ID"'"
            }
          },
          {
            "type": "text",
            "text": "'"$PROMPT"'"
          }
        ]
      }
    ],
    "thinking": {
      "type": "enabled"
    }
  }'

echo ""
echo "✅ 分析完成"
