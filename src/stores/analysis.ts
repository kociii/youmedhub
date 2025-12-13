import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ScriptSegment {
  id: number
  startTime: string
  endTime: string
  content: string
  visual: string
  audio: string
  duration: string
}

export const useAnalysisStore = defineStore('analysis', () => {
  const videoUrl = ref<string>('')
  const isAnalyzing = ref(false)
  const progress = ref(0)
  const segments = ref<ScriptSegment[]>([])
  const currentSegmentId = ref<number | null>(null)

  // Mock data generation
  const generateMockData = () => {
    segments.value = [
      {
        id: 1,
        startTime: '00:00',
        endTime: '00:05',
        duration: '5s',
        content: '大家好，欢迎来到YouMedHub。',
        visual: '主持人面带微笑，背景是简洁的科技风格。',
        audio: '背景音乐轻快。'
      },
      {
        id: 2,
        startTime: '00:05',
        endTime: '00:15',
        duration: '10s',
        content: '今天我们要介绍的是一款革命性的AI视频分析工具。',
        visual: '屏幕展示YouMedHub的Logo和核心功能关键词。',
        audio: '音效强调Logo出现。'
      },
      {
        id: 3,
        startTime: '00:15',
        endTime: '00:30',
        duration: '15s',
        content: '它能够自动识别视频内容，生成详细的脚本分析报告。',
        visual: '演示软件界面，鼠标点击上传按钮，进度条加载。',
        audio: '解说声音清晰有力。'
      },
      {
        id: 4,
        startTime: '00:30',
        endTime: '00:45',
        duration: '15s',
        content: '不仅如此，它还能分析画面构图、色彩和剪辑节奏。',
        visual: '展示分析结果页面，图表动态生成，数据跳动。',
        audio: '科技感音效。'
      },
      {
        id: 5,
        startTime: '00:45',
        endTime: '01:00',
        duration: '15s',
        content: '无论你是短视频创作者还是专业剪辑师，它都能提升你的效率。',
        visual: '不同用户使用场景的快速剪辑：博主在手机上查看，剪辑师在电脑前操作。',
        audio: '背景音乐推向高潮。'
      }
    ]
  }

  const startAnalysis = async () => {
    if (!videoUrl.value) return
    
    isAnalyzing.value = true
    progress.value = 0
    segments.value = []
    
    // Simulate analysis progress
    const interval = setInterval(() => {
      progress.value += 5
      if (progress.value >= 100) {
        clearInterval(interval)
        isAnalyzing.value = false
        generateMockData()
      }
    }, 100)
  }

  const setVideoUrl = (url: string) => {
    videoUrl.value = url
  }

  const setCurrentSegment = (id: number) => {
    currentSegmentId.value = id
  }

  return {
    videoUrl,
    isAnalyzing,
    progress,
    segments,
    currentSegmentId,
    startAnalysis,
    setVideoUrl,
    setCurrentSegment
  }
})
