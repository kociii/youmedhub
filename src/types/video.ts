// 视频分析脚本项
export interface VideoScriptItem {
  sequenceNumber: number;      // 序号
  shotType: string;            // 景别
  cameraMovement: string;      // 运镜方式
  visualContent: string;       // 画面内容
  onScreenText: string;        // 画面文案
  voiceover: string;           // 口播/台词
  audio: string;               // 音效/音乐
  startTime: string;           // 镜头开始时间 (MM:SS)
  endTime: string;             // 镜头结束时间 (MM:SS)
  duration: string;            // 镜头时长 (MM:SS)
}

// API 返回结果
export interface VideoAnalysisResponse {
  rep: VideoScriptItem[];
}

// 分析状态
export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';

// Token 使用统计
export interface TokenUsage {
  prompt_tokens: number;      // 输入 Tokens
  completion_tokens: number;  // 输出 Tokens
  total_tokens: number;       // 总计 Tokens
}

// 历史记录
export interface HistoryRecord {
  id: string;                    // 唯一ID（时间戳+随机字符串）
  timestamp: string;             // ISO时间戳
  videoName: string;              // 视频文件名
  videoSize: number;             // 视频文件大小（字节）
  videoDuration: string;           // 视频时长（MM:SS格式）
  videoFormat: string;            // 视频格式（MP4等）
  fileHandle: FileSystemFileHandle | null;  // 文件句柄（无法序列化，不存储）
  filePath: string | null;        // 文件路径信息（存储在localStorage，格式：recordId -> path）
  model: string;                  // AI模型名称
  analysisResult: VideoAnalysisResponse;    // 分析结果
  markdownContent: string;        // Markdown原始内容
  tokenUsage: TokenUsage | null;   // Token使用统计
}

// 历史记录列表项（不包含文件句柄，用于列表展示）
export interface HistoryRecordItem {
  id: string;
  timestamp: string;
  videoName: string;
  videoSize: number;
  videoDuration: string;
  videoFormat: string;
  model: string;
  sceneCount: number;             // 场景数量（从analysisResult.rep.length获取）
  tokenUsage: TokenUsage | null;
}
