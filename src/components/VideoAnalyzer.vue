<template>
  <div class="app-container">
    <!-- 1. 顶部栏：紧凑高度 -->
    <header class="header-section">
      <div class="brand-title">
        <i class="bi bi-camera-reels-fill"></i>
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
            <!-- 标题与模型选择 -->
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="fw-bold mb-0 text-dark" style="font-size: 0.9rem;">
                <i class="bi bi-cloud-arrow-up me-2 text-primary"></i>视频源
              </h6>
              <select
                v-model="selectedModel"
                class="form-select form-select-sm"
                style="width: auto; font-size: 0.75rem;"
                :disabled="isAnalyzing"
              >
                <option value="qwen3-vl-flash">qwen3-vl-flash</option>
                <option value="qwen3-vl-plus">qwen3-vl-plus</option>
              </select>
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
        <!-- 3. 分析 Loading 遮罩 (位于右侧) -->
        <div v-if="isAnalyzing" class="right-panel-loading">
            <div class="loading-content">
                <div class="loading-spinner-lg"></div>
                <h5 class="fw-bold text-dark mb-2">正在智能分析中</h5>
                <p class="text-muted small">这可能需要几分钟时间，请耐心等待...</p>
                <p class="text-primary small">{{ progressMessage }}</p>
                
                <!-- 模拟进度步骤 -->
                <div class="loading-steps">
                    <div class="loading-step" :class="{ active: loadingStep >= 1 }">
                        <i class="bi" :class="loadingStep >= 1 ? 'bi-check-circle-fill' : 'bi-circle'"></i> 视频上传与预处理
                    </div>
                    <div class="loading-step" :class="{ active: loadingStep >= 2 }">
                        <i class="bi" :class="loadingStep >= 2 ? 'bi-check-circle-fill' : 'bi-circle'"></i> AI 场景识别与分析
                    </div>
                    <div class="loading-step" :class="{ active: loadingStep >= 3 }">
                        <i class="bi" :class="loadingStep >= 3 ? 'bi-check-circle-fill' : 'bi-circle'"></i> 生成结构化结果
                    </div>
                </div>
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
                <div v-if="!hasResults && !isAnalyzing" class="d-flex flex-column align-items-center justify-content-center h-100 text-muted" style="min-height: 300px;">
                    <i class="bi bi-clipboard-data display-4 mb-3 opacity-25"></i>
                    <p>暂无数据，请先进行分析</p>
                </div>

                <!-- 结果表格 -->
                <template v-if="hasResults">
                    <div class="d-flex justify-content-between align-items-center p-3 bg-white border-bottom sticky-top">
                        <span class="fw-bold text-primary"><i class="bi bi-check-all me-1"></i> {{ displayedItems.length }} 个场景</span>
                    </div>
                    <table class="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th style="width: 50px;">#</th>
                                <th style="width: 80px;">景别</th>
                                <th style="width: 80px;">运镜</th>
                                <th style="width: 25%;">画面</th>
                                <th>文案/口播</th>
                                <th style="width: 150px;">时长</th>
                                <th style="width: 220px;">视频片段</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in displayedItems" :key="item.sequenceNumber">
                                <td class="text-center text-secondary">{{ item.sequenceNumber }}</td>
                                <td><span class="badge bg-light text-dark border fw-normal">{{ item.shotType }}</span></td>
                                <td><span class="badge bg-light text-dark border fw-normal">{{ item.cameraMovement }}</span></td>
                                <td><small class="d-block text-wrap" style="max-height:4.5em;overflow:hidden;">{{ item.visualContent }}</small></td>
                                <td>
                                    <div class="small text-secondary mb-1"><i class="bi bi-card-text me-1"></i>{{ item.onScreenText !== '无' ? item.onScreenText : '-' }}</div>
                                    <div class="small text-muted"><i class="bi bi-mic me-1"></i>{{ item.voiceover !== '无' ? item.voiceover : '-' }}</div>
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
    <div v-if="showApiKeyModal" class="modal fade show" style="display: block; background: rgba(0,0,0,0.5);" tabindex="-1">
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
import { ref, onMounted, reactive, computed, nextTick } from 'vue';
import { analyzeVideo } from '../api/videoAnalysis';
import type { VideoAnalysisResponse } from '../types/video';
import { parseTimeToSeconds } from '../utils/videoCapture';
import VideoSegmentPlayer from './VideoPlayer/VideoSegmentPlayer.vue';

const API_KEY_STORAGE_KEY = 'dashscope_api_key';

// 响应式数据
const apiKey = ref('');
const tempApiKey = ref('');
const showApiKeyModal = ref(false);
const tableContainerRef = ref<HTMLElement | null>(null);
const isDragOver = ref(false);
const activeTab = ref('current');
const loadingStep = ref(1);
const selectedModel = ref<'qwen3-vl-flash' | 'qwen3-vl-plus'>('qwen3-vl-flash');

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
  progressMessage.value = '准备分析...';
  loadingStep.value = 1;

  try {
    // 模拟步骤1: 上传预处理
    loadingStep.value = 1;
    progressMessage.value = '准备上传视频...';

    const result = await analyzeVideo(
      videoFile.value,
      apiKey.value,
      selectedModel.value,
      (message) => {
        progressMessage.value = message;
        // 根据消息内容判断步骤
        if (message.includes('上传')) {
          loadingStep.value = 1;
        } else if (message.includes('分析')) {
          loadingStep.value = 2;
        }
      }
    );

    loadingStep.value = 3;
    progressMessage.value = '整理结果中...';

    // 最终结果
    analysisResult.value = result;
    scrollToBottom();

  } catch (err) {
    error.value = err instanceof Error ? err.message : '分析失败，请重试';
    analysisResult.value = null;
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
</script>

<style scoped>
/* 复用参考文件中的 CSS 变量和样式 */
:root {
    --primary-color: #4f46e5;
    --primary-hover: #4338ca;
    --bg-color: #f3f4f6;
    --card-bg: #ffffff;
    --text-primary: #111827;
    --text-secondary: #6b7280;
    --border-color: #e5e7eb;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --radius-lg: 12px;
    --radius-md: 8px;
    --header-height: 50px;
}

.app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background: #f3f4f6; /* fallback */
    background: var(--bg-color);
    overflow: hidden;
}

/* 顶部栏 */
.header-section {
    background: #ffffff;
    height: 50px;
    padding: 0 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    z-index: 10;
    flex-shrink: 0;
}

.brand-title {
    font-size: 1rem;
    font-weight: 700;
    color: #4f46e5;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.brand-subtitle {
    font-size: 0.8rem;
    color: #6b7280;
    font-weight: 400;
    margin-left: 0.5rem;
    padding-left: 0.5rem;
    border-left: 1px solid #e5e7eb;
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
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    position: relative;
}

/* 卡片通用样式 */
.custom-card {
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    border: 1px solid #e5e7eb;
    overflow: hidden;
}

.card-body-custom {
    padding: 1rem;
}

/* 上传区域 */
.upload-area {
    border: 2px dashed #cbd5e1;
    border-radius: 8px;
    padding: 2rem 1rem;
    text-align: center;
    background: #f8fafc;
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
    border-color: #4f46e5;
    background: #eef2ff;
}

.upload-icon {
    font-size: 2rem;
    color: #94a3b8;
    margin-bottom: 0.5rem;
}

/* 视频预览 */
.video-preview-container {
    min-height: auto;
}

.video-wrapper {
    background: #000;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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
    color: #6b7280;
    background: #f9fafb;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    border: 1px solid #e5e7eb;
}

.video-compact-info .divider {
    margin: 0 0.5rem;
    color: #d1d5db;
}

/* 状态消息 */
.status-message {
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    text-align: center;
}
.status-error { background-color: #fef2f2; color: #b91c1c; }
.status-success { background-color: #ecfdf5; color: #047857; }

/* Loading 遮罩 */
.right-panel-loading {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.95);
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
}

.loading-content {
    text-align: center;
}

.loading-spinner-lg {
    width: 3rem;
    height: 3rem;
    border: 3px solid #e0e7ff;
    border-top: 3px solid #4f46e5;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1.5rem auto;
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.loading-steps {
    margin-top: 2rem;
    text-align: left;
    width: 200px;
    margin-left: auto;
    margin-right: auto;
}

.loading-step {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
    color: #6b7280;
    font-size: 0.9rem;
    opacity: 0.5;
    transition: all 0.3s;
}

.loading-step.active {
    color: #4f46e5;
    font-weight: 500;
    opacity: 1;
}

/* Tabs */
.nav-tabs {
    border-bottom: 1px solid #e5e7eb;
    padding: 0 1rem;
    height: 45px;
}

.nav-tabs .nav-link {
    border: none;
    color: #6b7280;
    padding: 0 1rem;
    height: 45px;
    line-height: 45px;
    font-size: 0.9rem;
    cursor: pointer;
    background: transparent;
}

.nav-tabs .nav-link.active {
    color: #4f46e5;
    border-bottom: 2px solid #4f46e5;
    font-weight: 500;
}

/* 表格区域 */
#resultsContainer {
    flex: 1;
    overflow-y: auto;
    padding: 0;
}

.table thead th {
    background-color: #f8fafc;
    border-bottom: 1px solid #e5e7eb;
    color: #6b7280;
    font-weight: 600;
    padding: 0.75rem 1rem;
    position: sticky;
    top: 0;
    z-index: 10;
}

.table tbody td {
    padding: 0.6rem 1rem;
    vertical-align: middle;
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
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
::-webkit-scrollbar-track { background: transparent; }
</style>
