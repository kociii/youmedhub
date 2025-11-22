
### 视频理解

通义千问VL模型支持对视频内容进行理解，文件形式包括图像列表（视频帧）或视频文件。
> 建议使用性能较优的最新版或近期快照版模型理解视频文件。

**视频抽帧说明**

通义千问VL 模型通过从视频中提取帧序列进行内容分析，抽帧的频率决定了模型分析的精细度，不同 SDK 抽帧频率不同：
- 使用 DashScope SDK：可通过 fps参数来控制抽帧间隔（每隔 1/fps 秒抽取一帧），该参数范围为  (0.1, 10)且默认值为2.0。建议为高速运动场景设置较高 fps，为静态或长视频设置较低 fps。
- 使用OpenAI兼容SDK：采用固定频率抽帧（每0.5秒1帧），不支持自定义。

```javascript
// 使用OpenAI SDK或HTTP方式向通义千问VL模型直接输入视频文件时，需要将用户消息中的"type"参数设为"video_url"。
import OpenAI from "openai";

const openai = new OpenAI(
    {
        // 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey: "sk-xxx"
        // 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
        apiKey: process.env.DASHSCOPE_API_KEY,
        // 以下是北京地域base_url，如果使用新加坡地域的模型，需要将base_url替换为：https://dashscope-intl.aliyuncs.com/compatible-mode/v1
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    }
);

async function main() {
    const response = await openai.chat.completions.create({
        model: "qwen3-vl-plus",
        messages: [
        {role: "user",content: [
            // 直接传入视频文件时，请将type的值设置为video_url
            // 使用OpenAI SDK时，视频文件默认每间隔0.5秒抽取一帧，且不支持修改，如需自定义抽帧频率，请使用DashScope SDK.
            {type: "video_url", video_url: {"url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20241115/cqqkru/1.mp4"}},
            {type: "text", text: "这段视频的内容是什么?" },
        ]}]
    });
    console.log(response.choices[0].message.content);
}

main()
```

### 视频文件上传

```javascript 
import OpenAI from "openai";
import { readFileSync } from 'fs';

const openai = new OpenAI(
    {
        // 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey: "sk-xxx"
        // 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
        apiKey: process.env.DASHSCOPE_API_KEY,
        // 以下是北京地域base_url，如果使用新加坡地域的模型，需要将base_url替换为：https://dashscope-intl.aliyuncs.com/compatible-mode/v1
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    }
);

const encodeVideo = (videoPath) => {
    const videoFile = readFileSync(videoPath);
    return videoFile.toString('base64');
  };
// 将xxxx/test.mp4替换为你本地视频的绝对路径
const base64Video = encodeVideo("xxx/test.mp4")
async function main() {
    const completion = await openai.chat.completions.create({
        model: "qwen3-vl-plus", 
        messages: [
            {"role": "user",
             "content": [{
                 // 直接传入视频文件时，请将type的值设置为video_url
                "type": "video_url", 
                "video_url": {"url": `data:video/mp4;base64,${base64Video}`}},
                 {"type": "text", "text": "这段视频描绘的是什么景象?"}]}]
    });
    console.log(completion.choices[0].message.content);
}

main();
```
