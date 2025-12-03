<template>
  <div class="app-container">
    <!-- 1. 顶部栏：紧凑高度 -->
    <header class="header-section">
      <div class="brand-title">
        <img src="/logo.svg" alt="YouMedHub Logo" class="brand-logo" />
        <span>YouMedHub</span>
        <span class="brand-subtitle">AI 视频内容分析</span>
      </div>
      <div class="d-flex align-items-center gap-2">
         <button
          @click="showApiKeyModal = true"
          class="btn btn-sm"
          :class="apiKey ? 'btn-outline-success' : 'btn-outline-secondary'"
          style="font-size: 0.8rem;"
        >
          <i class="bi" :class="apiKey ? 'bi-key-fill' : 'bi-key'"></i>
          {{ apiKey ? 'API Key 已配置' : '配置 API Key' }}
        </button>
        <button class="btn btn-light btn-sm text-secondary" style="font-size: 0.8rem;">
            <i class="bi bi-github"></i> v1.0
        </button>
      </div>
    </header>

    <div class="main-content">
      <!-- 左侧面板 -->
      <aside class="left-panel">
        <!-- 上传与控制卡片 -->
        <div class="custom-card flex-grow-1 d-flex flex-column">
          <div class="card-body-custom flex-grow-1 d-flex flex-column">
            <!-- 标题 -->
            <div class="mb-3">
              <h6 class="fw-bold mb-0 text-dark" style="font-size: 0.9rem;">
                <i class="bi bi-cloud-arrow-up me-2 text-primary"></i>视频源
              </h6>
            </div>

            <!-- 上传区域 -->
            <div 
                v-if="!videoFile" 
                class="upload-area" 
                :class="{ dragover: isDragOver }"
                @click="triggerFileInput"
                @dragover.prevent="isDragOver = true"
                @dragleave.prevent="isDragOver = false"
                @drop.prevent="handleDrop"
            >
              <i class="bi bi-cloud-upload upload-icon"></i>
              <h6 class="mb-1 fw-bold text-dark" style="font-size: 0.9rem;">点击或拖拽上传</h6>
              <p class="text-muted small mb-0">支持 MP4, MOV, AVI 等格式（文件大小 < 100MB，通过临时文件服务上传）</p>
              <input 
                ref="fileInputRef" 
                type="file" 
                accept="video/*" 
                style="display: none;" 
                @change="handleFileChange"
            >
            </div>

            <!-- 2. 视频预览与信息：紧凑布局 -->
            <div v-else class="flex-grow-1 d-flex flex-column video-preview-container">
              <div class="video-wrapper">
                <video 
                    ref="videoRef" 
                    :src="videoUrl" 
                    controls 
                    @loadedmetadata="onVideoLoaded"
                >
                    您的浏览器不支持视频播放。
                </video>
              </div>
              
              <!-- 视频下方紧凑信息条 -->
              <div class="video-compact-info mt-2">
                <span class="text-truncate" style="max-width: 120px;" :title="videoFile.name">{{ videoFile.name }}</span>
                <span>
                  <span class="divider">|</span>
                  <span>{{ videoInfo.size }}</span>
                  <span class="divider">|</span>
                  <span>{{ videoInfo.duration }}</span>
                </span>
              </div>
            </div>

            <!-- 操作按钮组 -->
            <div class="d-grid gap-2 mt-3">
              <button 
                @click="handleAnalyze" 
                class="btn btn-primary" 
                :disabled="!videoFile || !apiKey || isAnalyzing"
              >
                <i class="bi bi-magic me-2"></i>
                {{ isAnalyzing ? '分析中...' : '开始分析' }}
              </button>
              
              <button 
                v-if="videoFile && !isAnalyzing" 
                @click="clearVideo" 
                class="btn btn-outline-secondary btn-sm"
              >
                <i class="bi bi-arrow-repeat me-1"></i>更换视频
              </button>
            </div>

            <!-- 错误消息 -->
            <div v-if="error" class="status-message status-error mt-2">
                {{ error }}
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧面板 -->
      <main class="right-panel">
        <!-- 紧凑进度条 -->
        <div v-if="isAnalyzing" class="compact-progress-bar">
            <div class="progress-info">
                <span class="text-primary fw-bold">{{ progressMessage }}</span>
                <div class="progress-steps">
                    <span class="step" :class="{ active: loadingStep >= 1 }">上传</span>
                    <span class="mx-1">→</span>
                    <span class="step" :class="{ active: loadingStep >= 2 }">分析</span>
                    <span class="mx-1">→</span>
                    <span class="step" :class="{ active: loadingStep >= 3 }">完成</span>
                </div>
            </div>
            <div class="progress" style="height: 3px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                     :style="{ width: (loadingStep / 3 * 100) + '%' }"></div>
            </div>
        </div>

        <!-- Tabs -->
        <ul class="nav nav-tabs" role="tablist">
          <li class="nav-item">
            <button 
                class="nav-link" 
                :class="{ active: activeTab === 'current' }"
                @click="activeTab = 'current'"
            >
              当前结果
            </button>
          </li>
          <li class="nav-item">
            <button 
                class="nav-link" 
                :class="{ active: activeTab === 'history' }"
                @click="activeTab = 'history'"
            >
              历史记录
            </button>
          </li>
        </ul>

        <div class="tab-content h-100" id="resultTabContent">
          <!-- 当前分析结果 -->
          <div v-show="activeTab === 'current'" class="tab-pane fade show active h-100 d-flex flex-column">
            <div id="resultsContainer" ref="tableContainerRef">
                <!-- 空状态 -->
                <div v-if="!hasResults && !isAnalyzing && !showMarkdown" class="d-flex flex-column align-items-center justify-content-center h-100 text-muted" style="min-height: 300px;">
                    <i class="bi bi-clipboard-data display-4 mb-3 opacity-25"></i>
                    <p>暂无数据，请先进行分析</p>
                </div>

                <!-- 流式 Markdown 渐进式显示 -->
                <div v-if="showMarkdown" class="streaming-markdown-container">
                    <!-- 流式状态提示栏 -->
                    <div class="streaming-status-bar">
                        <div class="d-flex align-items-center gap-3">
                            <div class="spinner-border spinner-border-sm text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <span class="text-primary fw-bold">
                                <i class="bi bi-cloud-download me-2"></i>AI 正在分析视频内容
                            </span>
                            <span class="badge bg-light text-secondary border">
                                已接收 {{ markdownContent.length }} 字符
                            </span>
                        </div>
                        <div class="streaming-hint">
                            <i class="bi bi-info-circle me-1"></i>
                            <small class="text-muted">内容正在实时更新...</small>
                        </div>
                    </div>

                    <!-- 实时渲染的 Markdown 内容 -->
                    <div class="streaming-markdown-content p-4">
                        <MarkdownRender
                            :content="markdownContent"
                            class="markdown-content"
                        />
                    </div>
                </div>

                <!-- 结果表格 -->
                <template v-if="hasResults && !showMarkdown">
                    <div class="d-flex justify-content-between align-items-center p-3 bg-white border-bottom sticky-top" style="z-index: 10;">
                        <div class="d-flex align-items-center gap-3">
                            <span class="fw-bold text-primary"><i class="bi bi-check-all me-1"></i> {{ displayedItems.length }} 个场景</span>
                            <span v-if="tokenUsage" class="badge bg-light text-secondary border" style="font-size: 0.7rem; font-weight: 400;">
                                <i class="bi bi-cpu me-1"></i>
                                输入: {{ tokenUsage.prompt_tokens.toLocaleString() }}
                                <span class="mx-1">|</span>
                                输出: {{ tokenUsage.completion_tokens.toLocaleString() }}
                                <span class="mx-1">|</span>
                                总计: {{ tokenUsage.total_tokens.toLocaleString() }}
                            </span>
                        </div>
                        <div class="d-flex gap-2">
                            <button
                                @click="exportToExcel(displayedItems, videoFile?.name?.replace(/\.[^/.]+$/, '') || '视频分析结果')"
                                class="btn btn-sm btn-outline-success"
                                style="font-size: 0.75rem;"
                            >
                                <i class="bi bi-file-earmark-excel me-1"></i>导出 Excel
                            </button>
                            <button
                                @click="showRawMode = !showRawMode"
                                class="btn btn-sm btn-outline-secondary"
                                style="font-size: 0.75rem;"
                            >
                                <i class="bi" :class="showRawMode ? 'bi-table' : 'bi-code-square'"></i>
                                {{ showRawMode ? '切换到表格' : '切换到原始' }}
                            </button>
                        </div>
                    </div>

                    <!-- 原始 Markdown 显示 -->
                    <div v-if="showRawMode" class="p-3">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="fw-bold text-secondary mb-0">
                                <i class="bi bi-table me-2"></i>Markdown 表格视图
                            </h6>
                            <button
                                @click="copyMarkdownToClipboard($event)"
                                class="btn btn-sm btn-outline-primary"
                                style="font-size: 0.75rem;"
                            >
                                <i class="bi bi-clipboard me-1"></i>复制原始内容
                            </button>
                        </div>
                        <div class="raw-markdown-render">
                            <MarkdownRender
                                :content="markdownContent"
                                class="markdown-content"
                            />
                        </div>
                    </div>

                    <!-- 表格显示 -->
                    <table v-else class="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th style="width: 50px;">#</th>
                                <th style="width: 70px;">景别</th>
                                <th style="width: 70px;">运镜</th>
                                <th style="width: 20%;">画面内容描述</th>
                                <th style="width: 20%;">画面文案/口播&台词</th>
                                <th style="width: 120px;">音效/BGM</th>
                                <th style="width: 150px;">镜头时长</th>
                                <th style="width: 220px;">视频片段</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in displayedItems" :key="item.sequenceNumber">
                                <td class="text-center text-secondary">{{ item.sequenceNumber }}</td>
                                <td><span class="badge bg-light text-dark border fw-normal">{{ item.shotType }}</span></td>
                                <td><span class="badge bg-light text-dark border fw-normal">{{ item.cameraMovement }}</span></td>
                                <td><small class="d-block text-wrap text-with-breaks" style="max-height:4.5em;overflow:hidden;">{{ formatTextWithBreaks(item.visualContent) }}</small></td>
                                <td>
                                    <div class="small text-secondary mb-1 text-with-breaks"><i class="bi bi-card-text me-1"></i>{{ item.onScreenText !== '无' ? formatTextWithBreaks(item.onScreenText) : '-' }}</div>
                                    <div class="small text-muted text-with-breaks"><i class="bi bi-mic me-1"></i>{{ item.voiceover !== '无' ? formatTextWithBreaks(item.voiceover) : '-' }}</div>
                                </td>
                                <td>
                                    <small class="text-muted d-block text-wrap text-with-breaks" style="max-height:3em;overflow:hidden;">
                                        <i class="bi bi-music-note-beamed me-1"></i>{{ item.audio !== '无' ? formatTextWithBreaks(item.audio) : '-' }}
                                    </small>
                                </td>
                                <td class="font-monospace small">
                                    <div class="mb-1">
                                        <span class="badge bg-primary" style="font-size: 0.75rem; font-weight: 500;">
                                            {{ item.duration }}
                                        </span>
                                    </div>
                                    <div class="text-muted" style="font-size: 0.65rem; line-height: 1.2;">
                                        <i class="bi bi-clock" style="font-size: 0.6rem;"></i>
                                        {{ item.startTime }} - {{ item.endTime }}
                                    </div>
                                </td>
                                <td class="text-center p-1">
                                    <div class="video-segment-wrapper">
                                        <VideoSegmentPlayer
                                            v-if="videoUrl"
                                            :video-url="videoUrl"
                                            :start-time="parseTimeToSeconds(item.startTime)"
                                            :end-time="parseTimeToSeconds(item.endTime)"
                                        />
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </template>
            </div>
          </div>

          <!-- 历史记录 (Placeholder) -->
          <div v-show="activeTab === 'history'" class="tab-pane fade show active h-100">
            <div class="p-3 overflow-auto h-100">
                <div class="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                    <p>暂无历史记录</p>
                </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- API Key 配置弹窗 -->
    <div v-if="showApiKeyModal" class="modal fade show" style="display: block; background: var(--overlay-bg);" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">配置 API Key</h5>
            <button type="button" class="btn-close" @click="showApiKeyModal = false"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted mb-3 small">请输入通义千问 API Key 以使用视频分析功能</p>
            <input
              v-model="tempApiKey"
              type="password"
              class="form-control"
              placeholder="请输入 API Key"
              @keyup.enter="confirmApiKey"
            />
          </div>
          <div class="modal-footer border-0">
            <button type="button" class="btn btn-light" @click="showApiKeyModal = false">取消</button>
            <button type="button" class="btn btn-primary" @click="confirmApiKey" :disabled="!tempApiKey">确定</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, nextTick, watch } from 'vue';
import { analyzeVideo, VIDEO_ANALYSIS_PROMPT } from '../api/videoAnalysis';
import type { VideoAnalysisResponse, TokenUsage } from '../types/video';
import { parseTimeToSeconds } from '../utils/videoCapture';
import VideoSegmentPlayer from './VideoPlayer/VideoSegmentPlayer.vue';
import { saveAnalysisToLocal } from '../utils/localCache';
import MarkdownRender from './MarkdownRender.vue';
import { exportToExcel } from '../utils/exportExcel';

const API_KEY_STORAGE_KEY = 'dashscope_api_key';

// 响应式数据
const apiKey = ref('');
const tempApiKey = ref('');
const showApiKeyModal = ref(false);
const tableContainerRef = ref<HTMLElement | null>(null);
const isDragOver = ref(false);
const activeTab = ref('current');
const loadingStep = ref(1);
// 固定使用 qwen3-vl-flash 模型
const selectedModel = 'qwen3-vl-flash' as const;

// 从 localStorage 加载 API Key
onMounted(() => {
  const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
  if (savedApiKey) {
    apiKey.value = savedApiKey;
  }
});

// 确认 API Key 配置
const confirmApiKey = () => {
  if (tempApiKey.value) {
    apiKey.value = tempApiKey.value;
    localStorage.setItem(API_KEY_STORAGE_KEY, tempApiKey.value);
    showApiKeyModal.value = false;
    tempApiKey.value = '';
  }
};

const videoFile = ref<File | null>(null);
const videoUrl = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);

// 视频信息
const videoInfo = reactive({
  format: '',
  size: '',
  duration: '',
});

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// 格式化时长
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 视频加载完成后获取信息
const onVideoLoaded = () => {
  if (videoFile.value && videoRef.value) {
    const ext = videoFile.value.name.split('.').pop()?.toUpperCase() || 'MP4';
    videoInfo.format = ext;
    videoInfo.size = formatFileSize(videoFile.value.size);
    videoInfo.duration = formatDuration(videoRef.value.duration);
  }
};
const isAnalyzing = ref(false);
const progressMessage = ref('');
const error = ref('');
const analysisResult = ref<VideoAnalysisResponse | null>(null);
const markdownContent = ref(''); // 流式 Markdown 内容
const showMarkdown = ref(false); // 是否显示 Markdown
const showRawMode = ref(false); // 是否显示原始 Markdown（切换模式）
const tokenUsage = ref<TokenUsage | null>(null); // Token 使用统计

// 监控流式内容变化
watch(markdownContent, (newVal) => {
  console.log('[DEBUG] markdownContent 更新:', newVal.substring(0, 100) + '...');
});

watch(showMarkdown, (newVal) => {
  console.log('[DEBUG] showMarkdown 更新:', newVal);
});

// 触发文件选择
const triggerFileInput = () => {
  fileInputRef.value?.click();
};

// 处理文件选择
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  processFile(file);
};

const handleDrop = (event: DragEvent) => {
    isDragOver.value = false;
    const file = event.dataTransfer?.files[0];
    processFile(file);
};

const processFile = (file: File | undefined) => {
    if (file && file.type.startsWith('video/')) {
        videoFile.value = file;
        videoUrl.value = URL.createObjectURL(file);
        error.value = '';
        analysisResult.value = null;
    } else if (file) {
        error.value = '请选择有效的视频文件';
    }
};

// 清除视频
const clearVideo = () => {
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value);
  }
  videoFile.value = null;
  videoUrl.value = '';
  analysisResult.value = null;
  error.value = '';
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

// 开始分析
const handleAnalyze = async () => {
  if (!videoFile.value || !apiKey.value) return;

  isAnalyzing.value = true;
  error.value = '';
  analysisResult.value = null;
  markdownContent.value = '';
  showMarkdown.value = false;
  tokenUsage.value = null; // 重置 Token 统计
  progressMessage.value = '准备分析...';
  loadingStep.value = 1;

  try {
    // 模拟步骤1: 上传预处理
    loadingStep.value = 1;
    progressMessage.value = '准备上传视频...';

    const result = await analyzeVideo(
      videoFile.value,
      apiKey.value,
      selectedModel,
      VIDEO_ANALYSIS_PROMPT,
      (message) => {
        progressMessage.value = message;
        // 根据消息内容判断步骤
        if (message.includes('上传')) {
          loadingStep.value = 1;
        } else if (message.includes('分析') || message.includes('接收')) {
          loadingStep.value = 2;
          // 不在这里设置 showMarkdown，等第一个 chunk 到达时再设置
        }
      },
      (chunk) => {
        // 流式回调：逐步追加 Markdown 内容
        console.log(`[DEBUG VideoAnalyzer] 接收流式 chunk，长度: ${chunk.length}，内容预览: "${chunk.substring(0, 50)}..."`);

        if (!showMarkdown.value) {
          // 第一个 chunk 到达时才显示 Markdown 容器
          showMarkdown.value = true;
          console.log('[DEBUG VideoAnalyzer] ✅ 启用 Markdown 显示模式');
        }

        markdownContent.value += chunk;
        console.log(`[DEBUG VideoAnalyzer] Markdown 累计长度: ${markdownContent.value.length}`);

        // 自动滚动到底部，让用户看到最新内容
        nextTick(() => {
          const container = tableContainerRef.value;
          if (container && showMarkdown.value) {
            container.scrollTop = container.scrollHeight;
          }
        });
      },
      (usage) => {
        // Token 使用回调
        tokenUsage.value = usage;
        console.log('[DEBUG] Token 统计:', usage);
      }
    );

    loadingStep.value = 3;
    progressMessage.value = '整理结果中...';

    // 最终结果
    analysisResult.value = result;
    showMarkdown.value = false; // 隐藏 Markdown，显示表格

    // 保存到本地缓存（仅开发环境）
    if (import.meta.env.DEV && videoFile.value) {
      await saveAnalysisToLocal(
        videoFile.value.name,
        videoFile.value.size,
        selectedModel,
        result,
        markdownContent.value
      );
    }

    scrollToBottom();

  } catch (err) {
    error.value = err instanceof Error ? err.message : '分析失败，请重试';
    analysisResult.value = null;
    showMarkdown.value = false;
  } finally {
    // 延迟一点关闭 loading，让用户看到完成状态
    setTimeout(() => {
        isAnalyzing.value = false;
    }, 800);
  }
};

// 计算属性
const hasResults = computed(() => {
  return analysisResult.value && analysisResult.value.rep && analysisResult.value.rep.length > 0;
});

const displayedItems = computed(() => {
  return analysisResult.value?.rep || [];
});

// 自动滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (tableContainerRef.value) {
      tableContainerRef.value.scrollTo({
        top: tableContainerRef.value.scrollHeight,
        behavior: 'smooth'
      });
    }
  });
};

// 复制 Markdown 到剪贴板
// 将 <br> 标签转换为换行符
const formatTextWithBreaks = (text: string): string => {
  if (!text) return text;
  // 替换 <br>、<br/>、<br />、<BR> 等各种形式为换行符
  return text.replace(/<br\s*\/?>/gi, '\n');
};

// 复制 Markdown 到剪贴板
const copyMarkdownToClipboard = async (event: Event) => {
  try {
    await navigator.clipboard.writeText(markdownContent.value);
    // 使用更友好的提示
    const btn = event.target as HTMLButtonElement;
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check me-1"></i>已复制';
      btn.classList.remove('btn-outline-primary');
      btn.classList.add('btn-success');
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline-primary');
      }, 2000);
    }
  } catch (err) {
    console.error('复制失败:', err);
    alert('复制失败，请手动复制');
  }
};
</script>

<style scoped>
/* 复用参考文件中的 CSS 变量和样式 */
:root {
    /* Variables mapped to global OKLCH system */
    --primary-color: var(--color-primary);
    --primary-hover: var(--color-primary-hover);
    --bg-color: var(--color-bg-page);
    --card-bg: var(--color-bg-card);
    --text-primary: var(--color-text-primary);
    --text-secondary: var(--color-text-secondary);
    --border-color: var(--color-border);
    --shadow-sm: var(--shadow-sm);
    --shadow-md: var(--shadow-md);
    
    --radius-lg: 12px;
    --radius-md: 8px;
    --header-height: 50px;
}

.app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background: var(--bg-color);
    overflow: hidden;
    color: var(--text-primary);
}

/* 顶部栏 */
.header-section {
    background: oklch(1 0 0);
    height: 50px;
    padding: 0 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: var(--shadow-sm);
    z-index: 10;
    flex-shrink: 0;
}

.brand-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--primary-color);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.brand-logo {
    width: 32px;
    height: 32px;
    object-fit: contain;
}

.brand-subtitle {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 400;
    margin-left: 0.5rem;
    padding-left: 0.5rem;
    border-left: 1px solid var(--border-color);
    display: inline-block;
}

/* 主内容区域 */
.main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
    padding: 1rem;
    gap: 1rem;
}

/* 左侧面板 */
.left-panel {
    background: #ffffff;
    border-radius: 12px;
    width: 360px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
}

/* 右侧面板 */
.right-panel {
    flex: 1;
    background: oklch(1 0 0);
    border-radius: 12px;
    box-shadow: var(--shadow-md);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--border-color);
    position: relative;
}

/* 卡片通用样式 */
.custom-card {
    background: var(--card-bg);
    border-radius: 12px;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
    overflow: hidden;
}

.card-body-custom {
    padding: 1rem;
}

/* 上传区域 */
.upload-area {
    border: 2px dashed var(--color-border-hover);
    border-radius: 8px;
    padding: 2rem 1rem;
    text-align: center;
    background: var(--color-primary-subtle);
    transition: all 0.3s ease;
    cursor: pointer;
    height: 200px;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.upload-area:hover, .upload-area.dragover {
    border-color: var(--primary-color);
    background: var(--color-primary-light);
}

.upload-icon {
    font-size: 2rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
}

/* 视频预览 */
.video-preview-container {
    min-height: auto;
}

.video-wrapper {
    background: black;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: var(--shadow-md);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.video-wrapper video {
    width: 100%;
    height: auto;
    max-width: 100%;
    display: block;
    object-fit: contain;
}

.video-compact-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--text-secondary);
    background: var(--color-bg-hover);
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    border: 1px solid var(--border-color);
}

.video-compact-info .divider {
    margin: 0 0.5rem;
    color: var(--color-border-hover);
}

/* 状态消息 */
.status-message {
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    text-align: center;
}
.status-error { background-color: var(--color-error-bg); color: var(--color-error); }
.status-success { background-color: var(--color-success-bg); color: var(--color-success); }

/* 紧凑进度条 */
.compact-progress-bar {
    background: var(--color-bg-hover);
    border-bottom: 1px solid var(--border-color);
    padding: 0.75rem 1rem;
}

.progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
}

.progress-steps {
    display: flex;
    align-items: center;
    font-size: 0.75rem;
}

.progress-steps .step {
    color: var(--color-text-tertiary);
    transition: color 0.3s;
}

.progress-steps .step.active {
    color: var(--primary-color);
    font-weight: 600;
}

/* 流式 Markdown 容器 */
.streaming-markdown-container {
    background: var(--card-bg);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
}

/* 流式状态提示栏 */
.streaming-status-bar {
    background: linear-gradient(135deg, var(--color-primary-subtle) 0%, var(--color-primary-light) 100%);
    border-bottom: 2px solid var(--primary-color);
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    box-shadow: var(--shadow-sm);
}

.streaming-hint {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

/* 流式 Markdown 内容区域 */
.streaming-markdown-content {
    flex: 1;
    overflow-y: auto;
    background: var(--card-bg);
    animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Markdown 内容样式 */
.markdown-content {
    font-size: 0.9rem;
    line-height: 1.6;
}

.markdown-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.markdown-content table th,
.markdown-content table td {
    border: 1px solid var(--border-color);
    padding: 0.5rem;
    text-align: left;
}

.markdown-content table th {
    background-color: var(--color-bg-hover);
    font-weight: 600;
    color: var(--text-secondary);
}

.markdown-content table tr:nth-child(even) {
    background-color: var(--color-bg-hover);
}

/* Tabs */
.nav-tabs {
    border-bottom: 1px solid var(--border-color);
    padding: 0 1rem;
    height: 45px;
}

.nav-tabs .nav-link {
    border: none;
    color: var(--text-secondary);
    padding: 0 1rem;
    height: 45px;
    line-height: 45px;
    font-size: 0.9rem;
    cursor: pointer;
    background: transparent;
}

.nav-tabs .nav-link.active {
    color: var(--primary-color);
    border-bottom: 2px solid var(--primary-color);
    font-weight: 500;
}

/* 表格区域 */
#resultsContainer {
    flex: 1;
    overflow-y: auto;
    padding: 0;
}

.table thead th {
    background-color: var(--color-bg-hover);
    border-bottom: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-weight: 600;
    padding: 0.75rem 1rem;
    position: sticky;
    top: 0;
    z-index: 9;
}

.table tbody td {
    padding: 0.6rem 1rem;
    vertical-align: middle;
}

/* 处理 <br> 换行 */
.text-with-breaks {
    white-space: pre-line; /* 保留换行符但折叠多余空格 */
}

/* 视频片段容器 */
.video-segment-wrapper {
    width: 200px;
    max-width: 200px;
    margin: 0 auto;
}

.video-segment-wrapper video {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 4px;
}

/* 滚动条优化 */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: var(--color-border-hover); border-radius: 3px; }
::-webkit-scrollbar-track { background: transparent; }

/* 原始 Markdown 渲染容器 */
.raw-markdown-render {
    background: var(--card-bg);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    overflow: auto;
}

.raw-markdown-render .markdown-content {
    padding: 1rem;
}
</style>
