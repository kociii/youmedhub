/**
 * 视频截图和片段截取工具
 */

// 解析时间字符串为秒数
// 支持格式：MM:SS, HH:MM:SS, MM:SS:FF (FF 为帧数，按 30fps 计算)
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;

  const parts = timeStr.split(':').map(s => s.trim());

  if (parts.length === 2) {
    // MM:SS 格式
    const minutes = parseInt(parts[0] || '0') || 0;
    const seconds = parseInt(parts[1] || '0') || 0;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS 或 MM:SS:FF 格式
    const first = parseInt(parts[0] || '0') || 0;
    const second = parseInt(parts[1] || '0') || 0;
    const third = parseInt(parts[2] || '0') || 0;

    // 判断是否为帧数格式（第一个数字较小，通常 < 60）
    if (first < 60 && third < 60) {
      // MM:SS:FF 格式，假设 30fps
      const minutes = first;
      const seconds = second;
      const frames = third;
      return minutes * 60 + seconds + frames / 30;
    } else {
      // HH:MM:SS 格式
      const hours = first;
      const minutes = second;
      const seconds = third;
      return hours * 3600 + minutes * 60 + seconds;
    }
  }

  return 0;
}

// 从视频中截取指定时间的帧作为图片
export async function captureFrameAtTime(
  videoElement: HTMLVideoElement,
  timeInSeconds: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = videoElement;

    console.log(`📸 [captureFrameAtTime] 开始截图`);
    console.log(`   - 目标时间: ${timeInSeconds}s`);
    console.log(`   - 视频总时长: ${video.duration}s`);
    console.log(`   - 视频尺寸: ${video.videoWidth}x${video.videoHeight}`);
    console.log(`   - 当前时间: ${video.currentTime}s`);

    // 验证视频已加载
    if (!video.videoWidth || !video.videoHeight) {
      reject(new Error('视频尚未加载完成'));
      return;
    }

    // 验证时间范围
    if (timeInSeconds < 0 || timeInSeconds > video.duration) {
      reject(new Error(`时间超出范围: ${timeInSeconds}s (视频总时长: ${video.duration}s)`));
      return;
    }

    // 保存原始时间
    const originalTime = video.currentTime;
    const originalPaused = video.paused;

    // 创建 canvas 用于截图
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('无法创建 Canvas 上下文'));
      return;
    }

    // 设置超时保护
    const timeout = setTimeout(() => {
      video.currentTime = originalTime;
      console.error(`❌ [captureFrameAtTime] 截图超时`);
      reject(new Error('截图超时'));
    }, 5000);

    // 监听 seeked 事件（视频定位完成）
    const onSeeked = () => {
      clearTimeout(timeout);

      try {
        console.log(`   - seeked 事件触发，当前时间: ${video.currentTime}s`);

        // 绘制当前帧到 canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 转换为 base64 图片
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        console.log(`✅ [captureFrameAtTime] 截图成功，图片大小: ${(imageDataUrl.length / 1024).toFixed(2)}KB`);

        // 恢复原始状态
        video.currentTime = originalTime;
        if (!originalPaused) {
          video.play().catch(() => {});
        }

        resolve(imageDataUrl);
      } catch (error) {
        console.error(`❌ [captureFrameAtTime] 截图失败:`, error);
        video.currentTime = originalTime;
        reject(error);
      } finally {
        video.removeEventListener('seeked', onSeeked);
      }
    };

    video.addEventListener('seeked', onSeeked);

    // 跳转到指定时间
    console.log(`   - 设置 currentTime = ${timeInSeconds}s`);
    video.currentTime = timeInSeconds;
  });
}

// 截取视频片段（生成 Blob URL）
export async function captureVideoSegment(
  videoFile: File,
  startTime: number,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 创建视频元素用于加载
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.preload = 'metadata';

    video.onloadedmetadata = async () => {
      try {
        // 计算结束时间
        const endTime = Math.min(startTime + duration, video.duration);

        // 使用 MediaRecorder API 录制片段
        const stream = (video as any).captureStream?.() || (video as any).mozCaptureStream?.();

        if (!stream) {
          // 如果浏览器不支持 captureStream，回退到简单的文件切片（仅适用于某些格式）
          reject(new Error('浏览器不支持视频片段截取功能'));
          return;
        }

        const chunks: Blob[] = [];
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8,opus'
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          URL.revokeObjectURL(video.src);
          resolve(url);
        };

        mediaRecorder.onerror = (error) => {
          URL.revokeObjectURL(video.src);
          reject(error);
        };

        // 开始录制
        mediaRecorder.start();
        video.currentTime = startTime;
        await video.play();

        // 监听时间更新，到达结束时间时停止
        const checkTime = () => {
          if (video.currentTime >= endTime) {
            video.pause();
            mediaRecorder.stop();
            video.removeEventListener('timeupdate', checkTime);
          } else {
            // 更新进度
            const progress = ((video.currentTime - startTime) / duration) * 100;
            onProgress?.(progress);
          }
        };

        video.addEventListener('timeupdate', checkTime);

      } catch (error) {
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('视频加载失败'));
    };
  });
}

// 批量截取关键帧
export async function captureAllKeyframes(
  videoElement: HTMLVideoElement,
  keyframeTimes: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const timeStr of keyframeTimes) {
    try {
      const seconds = parseTimeToSeconds(timeStr);
      const imageDataUrl = await captureFrameAtTime(videoElement, seconds);
      results.set(timeStr, imageDataUrl);
    } catch (error) {
      console.error(`截取关键帧失败 (${timeStr}):`, error);
      // 继续处理下一个
    }
  }

  return results;
}

// 下载图片
export function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 下载视频片段
export function downloadVideo(blobUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
