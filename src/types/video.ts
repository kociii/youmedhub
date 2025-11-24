// 视频分析脚本项
export interface VideoScriptItem {
  sequenceNumber: number;      // 序号
  shotType: string;            // 景别
  cameraMovement: string;      // 运镜方式
  visualContent: string;       // 画面内容
  onScreenText: string;        // 画面文案
  voiceover: string;           // 口播
  audio: string;               // 音效/音乐
  startTime: string;           // 开始时间 (MM:SS)
  endTime: string;             // 结束时间 (MM:SS)
  duration: string;            // 时长 (MM:SS)
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
