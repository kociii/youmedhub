import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userRequest } from '@/utils/request'
import { useUserStore } from './user'
import { messageManager } from '@/utils/message'

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
  const videoFile = ref<File | null>(null)
  const isAnalyzing = ref(false)
  const progress = ref(0)
  const segments = ref<ScriptSegment[]>([])
  const currentSegmentId = ref<number | null>(null)
  const rawResponse = ref<string>('')
  const currentTaskId = ref<number | null>(null)

  // New state for configuration
  const selectedModel = ref<string>('')
  const enableThinking = ref<boolean>(false)

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
    const userStore = useUserStore()

    if (!videoUrl.value) {
      messageManager.error('请先上传视频')
      return
    }

    if (!selectedModel.value) {
      messageManager.error('请选择分析模型')
      return
    }

    if (!userStore.user) {
      messageManager.error('请先登录')
      return
    }

    // 检查用户点数
    if (userStore.user.credits < 5) {
      messageManager.error('点数不足，请充值后再使用分析功能')
      return
    }

    isAnalyzing.value = true
    progress.value = 0
    segments.value = []
    rawResponse.value = ''

    try {
      const token = localStorage.getItem('user_token')
      if (!token) {
        throw new Error('请先登录')
      }

      const response = await fetch('http://localhost:8000/api/analysis/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          video_url: videoUrl.value,
          model_id: selectedModel.value,
          enable_thinking: enableThinking.value
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || '分析请求失败')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              // 更新任务ID
              if (data.task_id) {
                currentTaskId.value = data.task_id
              }

              if (data.type === 'content') {
                rawResponse.value += data.data
                // TODO: 解析内容为 segments
              } else if (data.type === 'thinking') {
                // TODO: 显示思考过程
              } else if (data.type === 'done') {
                isAnalyzing.value = false
                // 刷新用户信息以更新点数
                await userStore.fetchMe()
                messageManager.success('分析完成！')
              } else if (data.error) {
                throw new Error(data.error)
              }
            } catch (e) {
              console.error('解析响应数据失败:', e)
            }
          }
        }
      }
    } catch (error: any) {
      isAnalyzing.value = false
      if (error.response?.status === 401) {
        messageManager.error('请先登录')
      } else if (error.response?.status === 402) {
        messageManager.error('点数不足，请充值')
      } else {
        messageManager.error(error.message || '分析失败，请重试')
      }
    }
  }

  const setVideoUrl = (url: string) => {
    videoUrl.value = url
  }

  const setVideoFile = (file: File | null) => {
    videoFile.value = file
  }

  const setCurrentSegment = (id: number) => {
    currentSegmentId.value = id
  }

  return {
    videoUrl,
    videoFile,
    isAnalyzing,
    progress,
    segments,
    currentSegmentId,
    rawResponse,
    currentTaskId,
    selectedModel,
    enableThinking,
    startAnalysis,
    setVideoUrl,
    setVideoFile,
    setCurrentSegment
  }
})
