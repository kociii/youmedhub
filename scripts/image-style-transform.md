# 图片风格转换 API

## cURL 命令

```bash
curl --location --request POST 'https://www.runninghub.cn/openapi/v2/rhart-image-n-g31-flash/image-to-image' \
--header "Content-Type: application/json" \
--header "Authorization: Bearer ee4739f9078f4879859d5021ef235ea1" \
--data-raw '{
  "imageUrls": [
    "https://www.runninghub.cn/view?filename=174ba2c54b8af1fdd5a01370049dd6407a693d8b05b4717079698e87680e038e.png&type=input&subfolder=&Rh-Comfy-Auth=eyJ1c2VySWQiOiIzZjY1MTNlNWEwNjY1N2I4OGYyNjU5NTEzYmU3ZDM0YyIsInNpZ25FeHBpcmUiOjE3NzI3NjM5NDg5OTQsInRzIjoxNzcyMTU5MTQ4OTk0LCJzaWduIjoiNjAxNWY0MjI2NzI2Yzk0YTFkOTExNjg2NGRkZmU2ZTAifQ==&Rh-Identify=3f6513e5a06657b88f2659513be7d34c&rand=0.8958046627705756"
  ],
  "prompt": "将这张线稿转换为明代水墨武侠风格的精细彩图。严格保留人物的动作轮廓与黑鸦的形态，将背景替换为风雪交加的竹林。增强水墨晕染的纹理感，整体色调偏冷，烘托出肃杀的氛围。",
  "resolution": "1k"
}'
```

## 参数说明

| 参数 | 说明 |
|------|------|
| `imageUrls` | 输入图片 URL 数组 |
| `prompt` | 风格转换提示词 |
| `resolution` | 分辨率：`1k` / `2k` / `4k` |

## 注意事项

- 长连接 API，等待时间约 30-120 秒
- 需要网络能访问 `runninghub.cn`
