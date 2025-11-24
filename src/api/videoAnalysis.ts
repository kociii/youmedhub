import type { VideoAnalysisResponse } from '../types/video';

const ANALYSIS_PROMPT = `你是一个资深且专业的视频创作者,从业多年,不仅能够独立完成视频的脚本创作、视频拍摄、视频剪辑等工作,还能够很好的鉴赏、分析识别,准确的拆解一个视频的内容及要点内容。
根据提供给你的视频,对视频进行分析,并结构化的输出你从视频中分析出的内容。
输出要求:以 json 结构输出
表格标题:序号、景别、运镜方式、画面内容、画面文案、口播、音效/音乐、开始时间、结束时间、时长
口播定义:口播是视频中人物的说话内容。
运镜方式定义:运镜方式是视频中运镜的方式，包括平移、旋转、缩放、上摇、跟焦等。
音效/音乐定义:音效/音乐是视频中背景音乐、环境音效、物品声音等音效。
时长定义:时长是视频中每个画面或场景的持续时间，包括画面停留时间、画面切换时间、画面过渡时间等。
开始时间定义:开始时间是指视频中每个画面或场景的开始时间。
结束时间定义:结束时间是指视频中每个画面或场景的结束时间。
json格式字段对应:
{
  "rep": [
    {
      "sequenceNumber": 1,
      "shotType": "",
      "cameraMovement": "",
      "visualContent": "",
      "onScreenText": "",
      "voiceover": "",
      "audio": "",
      "startTime": "MM:SS",
      "endTime": "MM:SS",
      "duration": "MM:SS",
    }
  ]
}
字段说明:
- sequenceNumber: 序号
- shotType: 景别
- cameraMovement: 运镜方式
- visualContent: 画面内容
- onScreenText: 画面文案
- voiceover: 口播
- audio: 音效/音乐
- startTime: 开始时间
- endTime: 结束时间
- duration: 时长

请只返回JSON格式的结果，不要包含其他文字说明。`;

// 最大文件大小 (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// 将视频文件转换为 base64
export async function videoToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data:video/xxx;base64, 前缀
      const base64 = result.split(',')[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('无法转换视频文件为 base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 获取视频的 MIME 类型
function getVideoMimeType(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
  };
  return mimeTypes[extension || ''] || 'video/mp4';
}

// 解析 API 返回的 JSON 内容
function parseAnalysisResult(content: string): VideoAnalysisResponse {
  // 尝试从返回内容中提取 JSON
  let jsonContent = content;

  // 如果返回内容包含 markdown 代码块，提取其中的 JSON
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch && jsonMatch[1]) {
    jsonContent = jsonMatch[1].trim();
  }

  try {
    const result = JSON.parse(jsonContent) as VideoAnalysisResponse;
    return result;
  } catch {
    // 尝试直接查找 JSON 对象
    const jsonObjectMatch = content.match(/\{[\s\S]*"rep"[\s\S]*\}/);
    if (jsonObjectMatch) {
      return JSON.parse(jsonObjectMatch[0]) as VideoAnalysisResponse;
    }
    throw new Error('无法解析 AI 返回的 JSON 格式');
  }
}

// 尝试从流式内容中解析部分 JSON（用于实时更新）
export function tryParsePartialJSON(content: string): VideoAnalysisResponse | null {
  try {
    // 移除可能的 markdown 代码块标记
    let jsonContent = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '');

    // 尝试查找 JSON 对象的开始
    const jsonStart = jsonContent.indexOf('{');
    if (jsonStart === -1) {
      return null;
    }

    jsonContent = jsonContent.slice(jsonStart);

    // 1. 尝试解析完整的 JSON（最优情况）
    try {
      const result = JSON.parse(jsonContent) as VideoAnalysisResponse;
      if (result.rep && Array.isArray(result.rep)) {
        console.log(`✅ [JSON解析] 完整JSON: ${result.rep.length} 个项目`);
        return result;
      }
    } catch {
      // 继续尝试部分解析
    }

    // 2. 查找 "rep" 数组
    const repMatch = jsonContent.match(/"rep"\s*:\s*\[([\s\S]*)/);
    if (!repMatch || !repMatch[1]) {
      return null;
    }

    const itemsContent = repMatch[1];
    const items: any[] = [];

    // 3. 逐个解析对象
    let depth = 0;
    let currentItem = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < itemsContent.length; i++) {
      const char = itemsContent[i];

      if (escapeNext) {
        currentItem += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        currentItem += char;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
      }

      if (!inString) {
        if (char === '{') depth++;
        if (char === '}') depth--;
      }

      currentItem += char;

      // 当找到一个完整的对象时（depth 回到 0 且以 } 结尾）
      if (depth === 0 && currentItem.trim().endsWith('}')) {
        const trimmed = currentItem.trim();
        if (trimmed.startsWith('{')) {
          try {
            // 移除尾部可能的逗号
            const cleaned = trimmed.replace(/,\s*$/, '');
            const item = JSON.parse(cleaned);
            items.push(item);
            console.log(`✅ [完整项 ${items.length}]`);
          } catch (err) {
            console.warn(`⚠️ [解析失败] 项目 ${items.length + 1}:`, err);
          }
        }
        currentItem = ''; // 重置，准备下一个对象
      }
    }

    // 4. 处理最后一个不完整的对象
    // 关键：只有当 currentItem 不为空且 depth > 0（说明对象未闭合）时才尝试部分解析
    if (currentItem.trim().length > 0 && depth > 0) {
      const partialItem = tryParseIncompleteObject(currentItem.trim());
      if (partialItem && Object.keys(partialItem).length > 0) {
        items.push(partialItem);
        console.log(`⚡ [部分项 ${items.length}] ${Object.keys(partialItem).length} 个字段`);
      }
    }

    if (items.length > 0) {
      return { rep: items };
    }

    return null;
  } catch (error) {
    console.error(`❌ [JSON解析] 出错:`, error);
    return null;
  }
}

// 尝试解析不完整的 JSON 对象（提取已接收的字段）
function tryParseIncompleteObject(incompleteJson: string): any {
  try {
    // 移除开头的逗号和空白
    let json = incompleteJson.trim().replace(/^,\s*/, '');

    // 确保以 { 开头
    if (!json.startsWith('{')) {
      return null;
    }

    // 提取所有已完成的字段（key: value 对）
    const result: any = {};

    // 匹配所有完整的字段：\"fieldName\": \"value\" 或 \"fieldName\": number
    const fieldPattern = /"([^"]+)"\s*:\s*(?:"([^"]*?)"|(\d+))/g;
    let match;

    while ((match = fieldPattern.exec(json)) !== null) {
      const fieldName = match[1];
      if (!fieldName) continue;

      const stringValue = match[2];
      const numberValue = match[3];

      result[fieldName] = stringValue !== undefined ? stringValue : Number(numberValue);
    }

    // 至少需要 sequenceNumber 字段才认为是有效的部分对象
    if (result.sequenceNumber !== undefined) {
      return result;
    }

    return null;
  } catch {
    return null;
  }
}

// 解析错误信息
function parseErrorMessage(error: any): string {
  const message = error?.error?.message || error?.message || '';

  if (message.includes('SafetyError') || message.includes('DataInspection')) {
    return '视频内容安全检查未通过，请尝试使用其他视频或使用在线视频 URL';
  }
  if (message.includes('InvalidParameter')) {
    return '参数无效，请检查视频格式是否支持（建议使用 MP4 格式）';
  }
  if (message.includes('TooLarge') || message.includes('size')) {
    return '视频文件过大，请使用小于 100MB 的视频或使用在线视频 URL';
  }
  if (message.includes('AuthenticationNotPass')) {
    return 'API Key 验证失败，请检查 API Key 是否正确';
  }
  if (message.includes('Throttling')) {
    return 'API 请求频率过高，请稍后重试';
  }

  return message || 'API 请求失败，请重试';
}

// ==================== 常规输出版本 ====================

// 使用视频 URL 分析 - 常规输出（非流式）
async function analyzeVideoByUrlNormal(
  videoUrl: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<VideoAnalysisResponse> {
  onProgress?.('正在调用 AI 分析视频...');

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'video_url',
              video_url: {
                url: videoUrl,
              },
            },
            {
              type: 'text',
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
      stream: false, // 关闭流式输出
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(parseErrorMessage(data));
  }

  onProgress?.('正在接收 AI 分析结果...');
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  onProgress?.('正在解析分析结果...');
  return parseAnalysisResult(content);
}

// 使用本地文件分析 - 常规输出（非流式）
async function analyzeVideoByFileNormal(
  file: File,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<VideoAnalysisResponse> {
  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`视频文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），请使用小于 100MB 的视频或使用在线视频 URL 模式`);
  }

  onProgress?.('正在读取视频文件...');
  const base64Video = await videoToBase64(file);
  const mimeType = getVideoMimeType(file);

  onProgress?.('正在调用 AI 分析视频...');

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'video_url',
              video_url: {
                url: `data:${mimeType};base64,${base64Video}`,
              },
            },
            {
              type: 'text',
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
      stream: false, // 关闭流式输出
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(parseErrorMessage(data));
  }

  onProgress?.('正在接收 AI 分析结果...');
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  onProgress?.('正在解析分析结果...');
  return parseAnalysisResult(content);
}

// ==================== 流式输出版本 ====================

// 使用视频 URL 分析 - 流式输出
async function analyzeVideoByUrlStreaming(
  videoUrl: string,
  apiKey: string,
  onProgress?: (message: string) => void,
  onStreamContent?: (content: string) => void
): Promise<VideoAnalysisResponse> {
  onProgress?.('正在调用 AI 分析视频...');

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'video_url',
              video_url: {
                url: videoUrl,
              },
            },
            {
              type: 'text',
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
      stream: true, // 启用流式输出
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(parseErrorMessage(data));
  }

  // 处理流式响应
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取响应流');
  }

  const decoder = new TextDecoder();
  let fullContent = '';

  onProgress?.('正在接收 AI 分析结果...');

  console.log('🚀 [流式输出] 开始接收数据流...');
  console.log(`⏰ [流式输出] 开始时间: ${new Date().toISOString()}`);

  try {
    let chunkCount = 0;
    let totalBytes = 0;
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log('✅ [流式输出] 数据流接收完成');
        console.log(`⏱️  [流式输出] 总耗时: ${duration}s, 总数据块: ${chunkCount}, 总字节: ${totalBytes}`);
        break;
      }

      chunkCount++;
      totalBytes += value.length;

      // 解码数据块
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`📦 [流式输出 #${chunkCount}] +${elapsed}s | ${value.length}字节 | ${lines.length}行 | 累计${totalBytes}字节`);

      for (const line of lines) {
        // SSE 格式：data: {...}
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // 移除 "data: " 前缀

          // 跳过 [DONE] 标记
          if (data === '[DONE]') {
            console.log('🏁 [流式输出] 收到 [DONE] 标记');
            continue;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;

            if (content) {
              fullContent += content;
              // 实时回调流式内容
              onStreamContent?.(fullContent);
            }
          } catch (e) {
            // 忽略解析错误的行
            console.warn('⚠️ [流式输出] 解析失败:', line);
          }
        }
      }
    }

    console.log(`📈 [流式输出] 总共接收 ${chunkCount} 个数据块`);
    console.log(`📄 [流式输出] 完整内容长度: ${fullContent.length} 字符`);
  } finally {
    reader.releaseLock();
  }

  if (!fullContent) {
    throw new Error('AI 返回内容为空');
  }

  onProgress?.('正在解析分析结果...');
  return parseAnalysisResult(fullContent);
}

// 使用本地文件分析 - 流式输出
async function analyzeVideoByFileStreaming(
  file: File,
  apiKey: string,
  onProgress?: (message: string) => void,
  onStreamContent?: (content: string) => void
): Promise<VideoAnalysisResponse> {
  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`视频文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），请使用小于 100MB 的视频或使用在线视频 URL 模式`);
  }

  onProgress?.('正在读取视频文件...');

  const base64Video = await videoToBase64(file);
  const mimeType = getVideoMimeType(file);

  onProgress?.('正在调用 AI 分析视频...');

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'video_url',
              video_url: {
                url: `data:${mimeType};base64,${base64Video}`,
              },
            },
            {
              type: 'text',
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
      stream: true, // 启用流式输出
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(parseErrorMessage(data));
  }

  // 处理流式响应（与 analyzeVideoByUrl 相同的逻辑）
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取响应流');
  }

  const decoder = new TextDecoder();
  let fullContent = '';

  onProgress?.('正在接收 AI 分析结果...');
  console.log('🚀 [流式输出] 开始接收数据流...');
  console.log(`⏰ [流式输出] 开始时间: ${new Date().toISOString()}`);

  try {
    let chunkCount = 0;
    let totalBytes = 0;
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log('✅ [流式输出] 数据流接收完成');
        console.log(`⏱️  [流式输出] 总耗时: ${duration}s, 总数据块: ${chunkCount}, 总字节: ${totalBytes}`);
        break;
      }

      chunkCount++;
      totalBytes += value.length;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`📦 [流式输出 #${chunkCount}] +${elapsed}s | ${value.length}字节 | ${lines.length}行 | 累计${totalBytes}字节`);

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            console.log('🏁 [流式输出] 收到 [DONE] 标记');
            continue;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;

            if (content) {
              fullContent += content;
              // 实时回调流式内容
              onStreamContent?.(fullContent);
            }
          } catch (e) {
            console.warn('⚠️ [流式输出] 解析失败:', line);
          }
        }
      }
    }

    console.log(`📈 [流式输出] 总共接收 ${chunkCount} 个数据块`);
    console.log(`📄 [流式输出] 完整内容长度: ${fullContent.length} 字符`);
  } finally {
    reader.releaseLock();
  }

  if (!fullContent) {
    throw new Error('AI 返回内容为空');
  }

  onProgress?.('正在解析分析结果...');
  return parseAnalysisResult(fullContent);
}

// ==================== 统一接口 ====================

// 统一分析接口 - 常规输出（默认）
export async function analyzeVideo(
  source: File | string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<VideoAnalysisResponse> {
  if (typeof source === 'string') {
    return analyzeVideoByUrlNormal(source, apiKey, onProgress);
  } else {
    return analyzeVideoByFileNormal(source, apiKey, onProgress);
  }
}

// 统一分析接口 - 流式输出版本
export async function analyzeVideoStreaming(
  source: File | string,
  apiKey: string,
  onProgress?: (message: string) => void,
  onStreamContent?: (content: string) => void
): Promise<VideoAnalysisResponse> {
  if (typeof source === 'string') {
    return analyzeVideoByUrlStreaming(source, apiKey, onProgress, onStreamContent);
  } else {
    return analyzeVideoByFileStreaming(source, apiKey, onProgress, onStreamContent);
  }
}
