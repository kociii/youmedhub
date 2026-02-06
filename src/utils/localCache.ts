// 本地缓存工具 - 保存 AI 分析结果到本地文件
import type { VideoAnalysisResponse } from '../types/video';

export interface CachedAnalysis {
  timestamp: string;
  videoName: string;
  videoSize: number;
  model: string;
  result: VideoAnalysisResponse;
  markdownContent?: string;
}

// 保存分析结果到本地
export async function saveAnalysisToLocal(
  videoName: string,
  videoSize: number,
  model: string,
  result: VideoAnalysisResponse,
  markdownContent?: string
): Promise<void> {
  try {
    const cache: CachedAnalysis = {
      timestamp: new Date().toISOString(),
      videoName,
      videoSize,
      model,
      result,
      markdownContent,
    };

    // 将缓存数据转换为 JSON
    const jsonContent = JSON.stringify(cache, null, 2);

    // 在开发环境中使用 localStorage 作为临时存储
    if (import.meta.env.DEV) {
      localStorage.setItem('latest_video_analysis', jsonContent);
      console.log('[本地缓存] 分析结果已保存到 localStorage');
    }

    // 提供下载功能（可选）
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = CACHE_FILE;
    // a.click();
    // URL.revokeObjectURL(url);

  } catch (error) {
    console.error('[本地缓存] 保存失败:', error);
  }
}

// 从本地加载最新的分析结果
export function loadLatestAnalysis(): CachedAnalysis | null {
  try {
    if (import.meta.env.DEV) {
      const cached = localStorage.getItem('latest_video_analysis');
      if (cached) {
        const data = JSON.parse(cached) as CachedAnalysis;
        console.log('[本地缓存] 已加载缓存的分析结果:', data.videoName);
        return data;
      }
    }
    return null;
  } catch (error) {
    console.error('[本地缓存] 加载失败:', error);
    return null;
  }
}

// 清除本地缓存
export function clearLocalCache(): void {
  try {
    if (import.meta.env.DEV) {
      localStorage.removeItem('latest_video_analysis');
      console.log('[本地缓存] 缓存已清除');
    }
  } catch (error) {
    console.error('[本地缓存] 清除失败:', error);
  }
}
