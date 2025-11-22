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
        <h2>视频脚本分析结果</h2>

        <div v-if="isAnalyzing" class="loading">
          <div class="spinner"></div>
          <p>{{ progressMessage }}</p>
        </div>

        <div v-else-if="analysisResult && analysisResult.rep.length > 0" class="table-container">
          <table class="result-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>景别</th>
                <th>运镜方式</th>
                <th>画面内容</th>
                <th>画面文案</th>
                <th>口播</th>
                <th>音效/音乐</th>
                <th>时长</th>
                <th>关键画面帧数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in analysisResult.rep" :key="item.sequenceNumber">
                <td>{{ item.sequenceNumber }}</td>
                <td>{{ item.shotType }}</td>
                <td>{{ item.cameraMovement }}</td>
                <td>{{ item.visualContent }}</td>
                <td>{{ item.onScreenText }}</td>
                <td>{{ item.voiceover }}</td>
                <td>{{ item.audio }}</td>
                <td>{{ item.duration }}</td>
                <td>{{ item.keyframeTimes }}</td>
              </tr>
            </tbody>
          </table>

          <!-- 导出按钮 -->
          <div class="export-actions">
            <button @click="exportToJSON" class="btn-export">导出 JSON</button>
            <button @click="exportToCSV" class="btn-export">导出 CSV</button>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>上传视频并点击"开始分析"后，这里将显示分析结果</p>
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
import { ref, onMounted, reactive } from 'vue';
import { analyzeVideo } from '../api/videoAnalysis';
import type { VideoAnalysisResponse } from '../types/video';

const API_KEY_STORAGE_KEY = 'dashscope_api_key';

// 响应式数据
const apiKey = ref('');
const tempApiKey = ref('');
const showApiKeyModal = ref(false);

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

  isAnalyzing.value = true;
  error.value = '';
  progressMessage.value = '准备分析...';

  try {
    const result = await analyzeVideo(
      videoFile.value,
      apiKey.value,
      (message) => {
        progressMessage.value = message;
      }
    );

    analysisResult.value = result;
    progressMessage.value = '分析完成';
  } catch (err) {
    error.value = err instanceof Error ? err.message : '分析失败，请重试';
    analysisResult.value = null;
  } finally {
    isAnalyzing.value = false;
  }
};

// 导出为 JSON
const exportToJSON = () => {
  if (!analysisResult.value) return;

  const dataStr = JSON.stringify(analysisResult.value, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `video-analysis-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// 导出为 CSV
const exportToCSV = () => {
  if (!analysisResult.value) return;

  const headers = [
    '序号',
    '景别',
    '运镜方式',
    '画面内容',
    '画面文案',
    '口播',
    '音效/音乐',
    '时长',
    '关键画面帧数',
  ];

  const rows = analysisResult.value.rep.map((item) => [
    item.sequenceNumber,
    item.shotType,
    item.cameraMovement,
    item.visualContent,
    item.onScreenText,
    item.voiceover,
    item.audio,
    item.duration,
    item.keyframeTimes,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `video-analysis-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
</script>

<style scoped>
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
  background: #f9f9f9;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

h2 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: #333;
  font-size: 1rem;
  font-weight: 600;
  flex-shrink: 0;
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
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2563eb;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading p {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

/* 表格 */
.table-container {
  flex: 1;
  overflow: auto;
  min-height: 0;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e5e5e5;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.result-table th,
.result-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.result-table th {
  background: #f5f5f5;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
  white-space: nowrap;
  z-index: 1;
}

.result-table tr:hover {
  background: #f9f9f9;
}

.result-table td {
  color: #555;
  max-width: 180px;
  word-wrap: break-word;
}

/* 导出操作 */
.export-actions {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  flex-shrink: 0;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

/* 加载状态 */
.loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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
