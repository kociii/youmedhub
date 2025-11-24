<template>
  <div class="video-analyzer">
    <!-- 顶部标题栏 -->
    <header class="header">
      <div class="logo">YouMedHub</div>
      <button
        @click="showApiKeyModal = true"
        class="btn-config"
        :class="{ configured: apiKey }"
      >
        {{ apiKey ? 'API Key 已配置' : '配置 API Key' }}
      </button>
    </header>

    <div class="container">
      <!-- 左侧：视频上传区域 -->
      <div class="left-panel">
        <div class="upload-section">
          <h2>视频上传</h2>

          <!-- 视频预览 -->
          <div v-if="videoFile" class="video-preview">
            <video
              ref="videoRef"
              :src="videoUrl"
              controls
              :key="videoUrl"
              @loadedmetadata="onVideoLoaded"
            ></video>

            <!-- 视频信息 -->
            <div class="video-info">
              <span>{{ videoInfo.format }}</span>
              <span>{{ videoInfo.size }}</span>
              <span>{{ videoInfo.duration }}</span>
            </div>

            <!-- 操作按钮 -->
            <div class="video-actions">
              <button
                v-if="!isAnalyzing"
                @click="clearVideo"
                class="btn-secondary"
              >
                更换视频
              </button>
              <button
                @click="handleAnalyze"
                :disabled="!apiKey || isAnalyzing"
                class="btn-primary"
              >
                {{ isAnalyzing ? '分析中...' : '开始分析' }}
              </button>
            </div>
          </div>

          <!-- 上传区域 -->
          <div v-else class="upload-area" @click="triggerFileInput">
            <input
              ref="fileInputRef"
              type="file"
              accept="video/*"
              @change="handleFileChange"
              style="display: none"
            />
            <div class="upload-placeholder">
              <div class="upload-icon">+</div>
              <p>点击上传视频文件</p>
              <p class="hint">支持 MP4, MOV, AVI 等格式</p>
            </div>
          </div>

          <!-- 错误信息 -->
          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </div>
      </div>

      <!-- 右侧：分析结果表格 -->
      <div class="right-panel">
        <div class="panel-header">
          <h2>视频脚本分析结果</h2>
          <div class="header-actions">
            <div v-if="isAnalyzing" class="analyzing-indicator">
              <div class="pulsing-dot"></div>
              <span>AI 分析中... {{ progressMessage }}</span>
            </div>
          </div>
        </div>

        <!-- 脚本表格容器 -->
        <div class="script-table-container" ref="tableContainerRef">
          <table class="script-table" v-if="hasResults">
            <thead>
              <tr>
                <th width="60">序号</th>
                <th width="80">景别</th>
                <th width="100">运镜方式</th>
                <th>画面内容</th>
                <th width="150">画面文案</th>
                <th width="200">口播</th>
                <th width="150">音效/音乐</th>
                <th width="120">时间范围</th>
                <th width="80">时长</th>
                <th width="120">视频片段</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in displayedItems" :key="item.sequenceNumber" class="script-row">
                <td class="text-center font-bold">{{ item.sequenceNumber }}</td>
                <td class="text-center">{{ item.shotType }}</td>
                <td class="text-center">{{ item.cameraMovement }}</td>
                <td class="text-left visual-content">{{ item.visualContent }}</td>
                <td class="text-left">{{ item.onScreenText !== '无' ? item.onScreenText : '' }}</td>
                <td class="text-left">{{ item.voiceover !== '无' ? item.voiceover : '' }}</td>
                <td class="text-left">{{ item.audio !== '无' ? item.audio : '' }}</td>
                <td class="text-center font-mono time-range">
                  <span class="time-start">{{ item.startTime }}</span>
                  <span class="time-separator">→</span>
                  <span class="time-end">{{ item.endTime }}</span>
                </td>
                <td class="text-center font-mono">{{ item.duration }}</td>
                <td class="text-center media-cell" style="width: 160px; height: 100px; padding: 4px;">
                  <VideoSegmentPlayer
                    v-if="videoUrl"
                    :video-url="videoUrl"
                    :start-time="parseTimeToSeconds(item.startTime)"
                    :end-time="parseTimeToSeconds(item.endTime)"
                  />
                </td>
              </tr>
              <!-- 骨架屏行（当正在分析且无最新数据时显示，或简单地显示加载状态） -->
              <tr v-if="isAnalyzing" class="loading-row">
                <td colspan="10">
                  <div class="loading-indicator">
                    <div class="spinner-small"></div>
                    <span>正在分析下一帧...</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 空状态 -->
          <div v-else-if="!isAnalyzing" class="empty-state">
            <div class="empty-icon">🎬</div>
            <p>上传视频并点击"开始分析"后，这里将显示分析结果</p>
          </div>
          
          <!-- 仅加载中无数据 -->
          <div v-else class="loading-state">
             <div class="spinner"></div>
             <p>正在初始化分析引擎...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- API Key 配置弹窗 -->
    <div v-if="showApiKeyModal" class="modal-overlay" @click.self="showApiKeyModal = false">
      <div class="modal">
        <h3>配置 API Key</h3>
        <p class="modal-hint">请输入通义千问 API Key</p>
        <input
          v-model="tempApiKey"
          type="password"
          placeholder="请输入 API Key"
          class="modal-input"
          @keyup.enter="confirmApiKey"
        />
        <div class="modal-actions">
          <button @click="showApiKeyModal = false" class="btn-cancel">取消</button>
          <button @click="confirmApiKey" class="btn-confirm" :disabled="!tempApiKey">确定</button>
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

  if (file) {
    videoFile.value = file;
    videoUrl.value = URL.createObjectURL(file);
    error.value = '';
    analysisResult.value = null;
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

  console.clear(); // 清空之前的日志
  console.log('═══════════════════════════════════════════════');
  console.log('🎬 [视频分析] 开始分析视频');
  console.log(`📹 [视频分析] 视频文件: ${videoFile.value.name}`);
  console.log(`📊 [视频分析] 文件大小: ${(videoFile.value.size / 1024 / 1024).toFixed(2)} MB`);
  console.log('═══════════════════════════════════════════════');

  isAnalyzing.value = true;
  error.value = '';
  analysisResult.value = null;
  progressMessage.value = '准备分析...';

  try {
    const result = await analyzeVideo(
      videoFile.value,
      apiKey.value,
      (message) => {
        progressMessage.value = message;
      }
    );

    // 最终结果
    analysisResult.value = result;
    progressMessage.value = '分析完成';
    scrollToBottom();

    console.log('═══════════════════════════════════════════════');
    console.log('🎉 [视频分析] 分析完成！');
    console.log(`📋 [视频分析] 最终结果包含 ${result.rep.length} 个脚本项目`);
    console.log('═══════════════════════════════════════════════');
  } catch (err) {
    console.log('═══════════════════════════════════════════════');
    console.log('❌ [视频分析] 分析失败');
    console.log(`🔴 [视频分析] 错误信息: ${err instanceof Error ? err.message : '未知错误'}`);
    console.log('═══════════════════════════════════════════════');

    error.value = err instanceof Error ? err.message : '分析失败，请重试';
    analysisResult.value = null;
  } finally {
    isAnalyzing.value = false;
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
/* 基础变量 */
:root {
  --primary-color: #2563eb;
  --bg-secondary: #f8fafc;
  --border-color: #e2e8f0;
}

.video-analyzer {
  height: 100%;
  width: 100%;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部标题栏 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: #2563eb;
}

.btn-config {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  color: #666;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-config:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.btn-config.configured {
  border-color: #10b981;
  color: #10b981;
}

.container {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1rem;
  min-height: 0;
  width: 100%;
  padding: 1rem;
}

.left-panel {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e5e5e5;
  overflow-y: auto;
}

.right-panel {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 0; /* 移除内边距，让表格贴边 */
}

.panel-header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fdfdfd;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-batch {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
}

.btn-batch:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
}

.btn-batch:active {
  transform: translateY(0);
}

h2 {
  margin: 0;
  color: #1e293b;
  font-size: 1rem;
  font-weight: 600;
}

.analyzing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #2563eb;
  background: #eff6ff;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.pulsing-dot {
  width: 8px;
  height: 8px;
  background-color: #2563eb;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  width: 360px;
  max-width: 90vw;
}

.modal h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.125rem;
}

.modal-hint {
  margin: 0 0 1rem 0;
  color: #666;
  font-size: 0.875rem;
}

.modal-input {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  box-sizing: border-box;
}

.modal-input:focus {
  outline: none;
  border-color: #2563eb;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  justify-content: flex-end;
}

.btn-cancel,
.btn-confirm {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #666;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-confirm {
  background: #2563eb;
  border: none;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-confirm:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

/* 视频预览 */
.video-preview video {
  width: 100%;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

/* 视频信息 */
.video-info {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.75rem;
  color: #666;
}

.video-info span {
  padding: 0.25rem 0.5rem;
  background: #e5e7eb;
  border-radius: 4px;
}

/* 视频操作按钮 */
.video-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.btn-secondary,
.btn-primary {
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #ffffff;
  border: 1px solid #d1d5db;
  color: #666;
}

.btn-secondary:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}

.btn-primary {
  background: #2563eb;
  border: none;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

/* 上传区域 */
.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #ffffff;
}

.upload-area:hover {
  border-color: #2563eb;
  background: #f0f7ff;
}

.upload-icon {
  font-size: 2rem;
  color: #9ca3af;
  margin-bottom: 0.5rem;
}

.upload-placeholder p {
  margin: 0.25rem 0;
  color: #555;
  font-size: 0.875rem;
}

.upload-placeholder .hint {
  font-size: 0.75rem;
  color: #999;
}

/* 导出按钮 */
.btn-export {
  width: 100%;
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export {
  background: #10b981;
  color: white;
}

.btn-export:hover {
  background: #059669;
}

/* 错误信息 */
.error-message {
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 6px;
  font-size: 0.75rem;
  border: 1px solid #fecaca;
}

.spinner {
  border: 3px solid #f1f5f9;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 表格容器 */
.script-table-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.script-table {
  width: 100%;
  border-collapse: collapse;
  background: #ffffff;
  font-size: 0.85rem;
}

.script-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f1f5f9;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.script-table th {
  padding: 0.75rem 0.5rem;
  font-weight: 600;
  color: #475569;
  text-align: center;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

.script-table td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: top;
  line-height: 1.5;
}

.script-row:hover td {
  background-color: #f8fafc;
}

/* 对齐方式 */
.text-center { text-align: center; }
.text-left { text-align: left; }
.font-bold { font-weight: 600; color: #2563eb; }
.font-mono { font-family: monospace; color: #64748b; }

/* 时间范围样式 */
.time-range {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  white-space: nowrap;
}

.time-separator {
  color: #94a3b8;
  font-weight: 300;
  padding: 0 0.125rem;
}

/* 画面内容列宽一点，允许换行 */
.visual-content {
  min-width: 200px;
}

/* 媒体单元格 */
.media-cell {
  padding: 0.5rem !important;
}


/* 下载按钮 */
.btn-download {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #10b981;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-download:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

/* 加载行 */
.loading-row td {
  padding: 1rem;
  background: #f8fafc;
  text-align: center;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.85rem;
}

.spinner-small {
  border: 2px solid #e2e8f0;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  gap: 1rem;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.5;
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
}


/* 流式输出内容（调试用，默认隐藏） */
.stream-content {
  margin-top: 1.5rem;
  width: 100%;
  max-width: 800px;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 1rem;
  max-height: 400px;
  overflow: auto;
}

.stream-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  color: #333;
  line-height: 1.5;
}

/* 响应式 */
@media (max-width: 768px) {
  .container {
    grid-template-columns: 1fr;
  }

  .left-panel {
    max-width: 100%;
  }

  .right-panel {
    height: 400px;
  }
}
</style>
