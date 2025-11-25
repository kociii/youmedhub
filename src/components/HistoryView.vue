<template>
  <div class="history-view">
    <!-- 加载状态 -->
    <div v-if="loading" class="d-flex flex-column align-items-center justify-content-center h-100 text-muted" style="min-height: 300px;">
      <div class="spinner-border text-primary mb-3" role="status">
        <span class="visually-hidden">加载中...</span>
      </div>
      <p>正在加载历史记录...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && historyRecords.length === 0" class="d-flex flex-column align-items-center justify-content-center h-100 text-muted" style="min-height: 300px;">
      <i class="bi bi-clock-history display-4 mb-3 opacity-25"></i>
      <p class="mb-0">暂无历史记录</p>
      <small class="text-muted">分析视频后，记录会自动保存到这里</small>
    </div>

    <!-- 历史记录列表 -->
    <div v-else class="history-list p-3">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="fw-bold mb-0 text-dark">
          <i class="bi bi-clock-history me-2 text-primary"></i>
          共 {{ historyRecords.length }} 条记录
        </h6>
        <button
          v-if="historyRecords.length > 0"
          @click="handleClearAll"
          class="btn btn-sm btn-outline-danger"
          style="font-size: 0.75rem;"
        >
          <i class="bi bi-trash me-1"></i>清空全部
        </button>
      </div>

      <div class="history-cards">
        <div
          v-for="record in historyRecords"
          :key="record.id"
          class="history-card"
          @click="handleLoadRecord(record.id)"
        >
          <div class="card-content">
            <!-- 视频信息 -->
            <div class="card-header">
              <div class="video-icon">
                <i class="bi bi-play-circle-fill"></i>
              </div>
              <div class="video-info flex-grow-1">
                <div class="video-name" :title="record.videoName">
                  {{ record.videoName }}
                </div>
                <div class="video-meta">
                  <span class="meta-item">
                    <i class="bi bi-file-earmark me-1"></i>
                    {{ formatFileSize(record.videoSize) }}
                  </span>
                  <span class="meta-divider">|</span>
                  <span class="meta-item">
                    <i class="bi bi-clock me-1"></i>
                    {{ record.videoDuration }}
                  </span>
                  <span class="meta-divider">|</span>
                  <span class="meta-item">
                    <i class="bi bi-film me-1"></i>
                    {{ record.videoFormat }}
                  </span>
                </div>
              </div>
              <button
                @click.stop="handleDeleteRecord(record.id)"
                class="btn-delete"
                title="删除记录"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>

            <!-- 分析信息 -->
            <div class="card-body">
              <div class="analysis-info">
                <span class="badge bg-primary">
                  <i class="bi bi-list-ul me-1"></i>
                  {{ record.sceneCount }} 个场景
                </span>
                <span class="badge bg-light text-secondary border">
                  <i class="bi bi-cpu me-1"></i>
                  {{ record.model }}
                </span>
                <span v-if="record.tokenUsage" class="badge bg-light text-secondary border" style="font-size: 0.7rem;">
                  <i class="bi bi-graph-up me-1"></i>
                  {{ record.tokenUsage.total_tokens.toLocaleString() }} tokens
                </span>
              </div>
              <div class="time-info">
                <i class="bi bi-calendar3 me-1"></i>
                {{ formatTime(record.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { HistoryRecordItem } from '../types/video';
import {
  getAllHistoryRecords,
  deleteHistoryRecord,
  clearAllHistory,
} from '../utils/historyStorage';

// Props
interface Props {
  onLoadRecord?: (recordId: string) => void;
}

const props = withDefaults(defineProps<Props>(), {
  onLoadRecord: undefined,
});

// 响应式数据
const loading = ref(true);
const historyRecords = ref<HistoryRecordItem[]>([]);

// 加载历史记录
const loadHistoryRecords = async () => {
  try {
    loading.value = true;
    console.log('[历史记录] 开始加载历史记录...');
    const records = await getAllHistoryRecords();
    console.log('[历史记录] 加载成功，记录数:', records.length);
    historyRecords.value = records;
  } catch (error) {
    console.error('[历史记录] 加载失败:', error);
    // 显示错误提示
    alert('加载历史记录失败: ' + (error instanceof Error ? error.message : String(error)));
  } finally {
    loading.value = false;
  }
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// 格式化时间
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  // 超过7天显示具体日期
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  if (year === now.getFullYear()) {
    return `${month}-${day} ${hour}:${minute}`;
  }
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

// 加载记录
const handleLoadRecord = async (recordId: string) => {
  if (props.onLoadRecord) {
    props.onLoadRecord(recordId);
  }
};

// 删除记录
const handleDeleteRecord = async (recordId: string) => {
  if (!confirm('确定要删除这条历史记录吗？')) {
    return;
  }

  try {
    await deleteHistoryRecord(recordId);
    await loadHistoryRecords(); // 重新加载列表
  } catch (error) {
    console.error('[历史记录] 删除失败:', error);
    alert('删除失败，请重试');
  }
};

// 清空全部
const handleClearAll = async () => {
  if (!confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
    return;
  }

  try {
    await clearAllHistory();
    await loadHistoryRecords(); // 重新加载列表
  } catch (error) {
    console.error('[历史记录] 清空失败:', error);
    alert('清空失败，请重试');
  }
};

// 暴露刷新方法
defineExpose({
  refresh: loadHistoryRecords,
});

// 组件挂载时加载
onMounted(() => {
  console.log('[HistoryView] 组件已挂载，开始加载历史记录');
  loadHistoryRecords();
});
</script>

<style scoped>
.history-view {
  height: 100%;
  width: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.history-list {
  max-width: 100%;
}

.history-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.history-card:hover {
  border-color: var(--primary-color, #0d6efd);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-content {
  padding: 1rem;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.video-icon {
  font-size: 2rem;
  color: var(--primary-color, #0d6efd);
  flex-shrink: 0;
}

.video-info {
  min-width: 0;
}

.video-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary, #212529);
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary, #6c757d);
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
}

.meta-divider {
  color: var(--border-color, #e0e0e0);
}

.btn-delete {
  background: transparent;
  border: none;
  color: var(--text-secondary, #6c757d);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  opacity: 0.6;
}

.btn-delete:hover {
  background: var(--color-error-bg, #fee);
  color: var(--color-error, #dc3545);
  opacity: 1;
}

.card-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.analysis-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.time-info {
  font-size: 0.75rem;
  color: var(--text-secondary, #6c757d);
  white-space: nowrap;
}

.badge {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
}

/* 滚动条优化 */
.history-view::-webkit-scrollbar {
  width: 6px;
}

.history-view::-webkit-scrollbar-thumb {
  background: var(--border-color, #e0e0e0);
  border-radius: 3px;
}

.history-view::-webkit-scrollbar-track {
  background: transparent;
}
</style>

