// 视频分析脚本项
export interface VideoScriptItem {
  sequenceNumber: number;      // 序号
  shotType: string;            // 景别
  cameraMovement: string;      // 运镜方式
  visualContent: string;       // 画面内容
  onScreenText: string;        // 画面文案
  voiceover: string;           // 口播
  audio: string;               // 音效/音乐
  duration: string;            // 时长
  keyframeTimes: string;       // 关键画面帧数
}

// API 返回结果
export interface VideoAnalysisResponse {
  rep: VideoScriptItem[];
}

// 分析状态
export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';
