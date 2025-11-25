// 历史记录存储工具 - 使用 IndexedDB + File System Access API
import type { HistoryRecord, HistoryRecordItem, VideoAnalysisResponse, TokenUsage } from '../types/video';

const DB_NAME = 'youmedhub_history';
const DB_VERSION = 1;
const STORE_NAME = 'records';
const FILE_HANDLE_STORE_NAME = 'fileHandles'; // 专门存储文件句柄的对象存储

// 数据库实例
let db: IDBDatabase | null = null;

// 内存中的文件句柄缓存（当前会话有效）
// key: recordId, value: FileSystemFileHandle
const fileHandleCache = new Map<string, FileSystemFileHandle>();

// 初始化数据库
export async function initHistoryDB(): Promise<IDBDatabase> {
  if (db) {
    return db;
  }

  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('[IndexedDB] 打开数据库失败:', event);
        reject(new Error('无法打开数据库: ' + (event.target as IDBRequest)?.error?.message || '未知错误'));
      };

      request.onsuccess = () => {
        db = request.result;
        console.log('[IndexedDB] 数据库打开成功');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        console.log('[IndexedDB] 数据库升级中...');
        const database = (event.target as IDBOpenDBRequest).result;

        // 创建对象存储
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = database.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          });

          // 创建时间戳索引（用于排序）
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[IndexedDB] 对象存储创建成功');
        }

        // 创建文件句柄存储（用于持久化文件句柄）
        if (!database.objectStoreNames.contains(FILE_HANDLE_STORE_NAME)) {
          database.createObjectStore(FILE_HANDLE_STORE_NAME, {
            keyPath: 'recordId',
          });
          console.log('[IndexedDB] 文件句柄存储创建成功');
        }
      };
    } catch (error) {
      console.error('[IndexedDB] 初始化异常:', error);
      reject(error);
    }
  });
}

// 检查浏览器是否支持 File System Access API
export function isFileSystemAccessSupported(): boolean {
  return 'showOpenFilePicker' in window && 'FileSystemFileHandle' in window;
}

// 从文件句柄获取视频文件
export async function getVideoFileFromHandle(
  fileHandle: FileSystemFileHandle | null
): Promise<File | null> {
  if (!fileHandle) {
    return null;
  }

  try {
    // 检查文件句柄是否仍然有效
    const file = await fileHandle.getFile();
    return file;
  } catch (error) {
    console.error('[历史记录] 文件句柄失效:', error);
    // 文件可能已被移动或删除
    if (error instanceof Error && error.name === 'NotFoundError') {
      throw new Error('文件已被移动或删除，请重新选择文件');
    }
    throw error;
  }
}

// 保存文件句柄到 IndexedDB（尝试使用 structuredClone）
async function saveFileHandleToIndexedDB(
  recordId: string,
  fileHandle: FileSystemFileHandle
): Promise<void> {
  const database = await initHistoryDB();

  return new Promise((resolve, reject) => {
    try {
      // 尝试使用 structuredClone 序列化文件句柄
      // 注意：这需要浏览器支持，某些浏览器可能不支持
      const transaction = database.transaction([FILE_HANDLE_STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(FILE_HANDLE_STORE_NAME);
      
      // 尝试直接存储文件句柄（某些浏览器支持）
      const request = objectStore.put({
        recordId,
        fileHandle,
      });

      request.onsuccess = () => {
        console.log('[历史记录] 文件句柄保存到 IndexedDB 成功');
        resolve();
      };

      request.onerror = (event) => {
        const error = (event.target as IDBRequest)?.error;
        // 如果是因为无法序列化，这是预期的
        if (error?.name === 'DataCloneError') {
          console.warn('[历史记录] 文件句柄无法序列化到 IndexedDB');
          resolve(); // 不抛出错误，只是无法持久化
        } else {
          reject(new Error('保存文件句柄失败: ' + (error?.message || '未知错误')));
        }
      };
    } catch (error) {
      // 如果 structuredClone 不支持，捕获错误
      console.warn('[历史记录] 文件句柄序列化失败:', error);
      resolve(); // 不抛出错误，允许继续
    }
  });
}

// 从 IndexedDB 加载文件句柄
async function loadFileHandleFromIndexedDB(
  recordId: string
): Promise<FileSystemFileHandle | null> {
  const database = await initHistoryDB();

  return new Promise((resolve) => {
    try {
      const transaction = database.transaction([FILE_HANDLE_STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(FILE_HANDLE_STORE_NAME);
      const request = objectStore.get(recordId);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.fileHandle) {
          // 验证文件句柄是否仍然有效
          result.fileHandle
            .getFile()
            .then(() => {
              console.log('[历史记录] 从 IndexedDB 加载文件句柄成功');
              resolve(result.fileHandle);
            })
            .catch((error: any) => {
              console.warn('[历史记录] IndexedDB 中的文件句柄已失效:', error);
              // 删除失效的文件句柄
              removeFileHandleFromIndexedDB(recordId);
              resolve(null);
            });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.warn('[历史记录] 从 IndexedDB 加载文件句柄失败');
        resolve(null);
      };
    } catch (error) {
      console.warn('[历史记录] 加载文件句柄异常:', error);
      resolve(null);
    }
  });
}

// 从 IndexedDB 删除文件句柄
async function removeFileHandleFromIndexedDB(recordId: string): Promise<void> {
  const database = await initHistoryDB();

  return new Promise((resolve) => {
    try {
      const transaction = database.transaction([FILE_HANDLE_STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(FILE_HANDLE_STORE_NAME);
      const request = objectStore.delete(recordId);

      request.onsuccess = () => {
        console.log('[历史记录] 从 IndexedDB 删除文件句柄成功');
        resolve();
      };

      request.onerror = () => {
        console.warn('[历史记录] 从 IndexedDB 删除文件句柄失败');
        resolve(); // 不抛出错误
      };
    } catch (error) {
      console.warn('[历史记录] 删除文件句柄异常:', error);
      resolve();
    }
  });
}

// 从内存缓存获取文件句柄
export function getFileHandleFromCache(recordId: string): FileSystemFileHandle | null {
  return fileHandleCache.get(recordId) || null;
}

// 从持久化存储加载文件句柄（优先从 IndexedDB，然后从内存缓存）
export async function loadFileHandle(recordId: string): Promise<FileSystemFileHandle | null> {
  // 首先检查内存缓存
  const cachedHandle = fileHandleCache.get(recordId);
  if (cachedHandle) {
    // 验证缓存中的文件句柄是否仍然有效
    try {
      await cachedHandle.getFile();
      return cachedHandle;
    } catch {
      // 缓存中的文件句柄失效，移除
      fileHandleCache.delete(recordId);
    }
  }

  // 从 IndexedDB 加载
  const persistedHandle = await loadFileHandleFromIndexedDB(recordId);
  if (persistedHandle) {
    // 保存到内存缓存
    fileHandleCache.set(recordId, persistedHandle);
    return persistedHandle;
  }

  return null;
}

// 将文件句柄保存到内存缓存
export function saveFileHandleToCache(recordId: string, fileHandle: FileSystemFileHandle | null): void {
  if (fileHandle) {
    fileHandleCache.set(recordId, fileHandle);
    console.log('[历史记录] 文件句柄已保存到内存缓存:', recordId);
  } else {
    fileHandleCache.delete(recordId);
  }
}

// 从内存缓存删除文件句柄
export function removeFileHandleFromCache(recordId: string): void {
  fileHandleCache.delete(recordId);
}

// 生成唯一ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// 清理对象，确保可以被 IndexedDB 序列化
// 使用 JSON 序列化/反序列化来移除所有无法序列化的属性
function sanitizeForIndexedDB(obj: any): any {
  try {
    // 使用 JSON 序列化/反序列化来深拷贝并清理对象
    // 这会自动移除函数、Symbol、undefined 等无法序列化的属性
    return JSON.parse(JSON.stringify(obj, (_key, value) => {
      // 跳过 undefined
      if (value === undefined) {
        return null;
      }
      // 跳过函数
      if (typeof value === 'function') {
        return null;
      }
      // 跳过 Symbol
      if (typeof value === 'symbol') {
        return null;
      }
      // 跳过 FileSystemFileHandle
      if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'FileSystemFileHandle') {
        return null;
      }
      return value;
    }));
  } catch (error) {
    console.error('[历史记录] 清理对象失败:', error);
    // 如果 JSON 序列化失败，返回一个安全的空对象结构
    return {
      id: obj.id || '',
      timestamp: obj.timestamp || new Date().toISOString(),
      videoName: obj.videoName || '',
      videoSize: obj.videoSize || 0,
      videoDuration: obj.videoDuration || '',
      videoFormat: obj.videoFormat || '',
      fileHandle: null,
      model: obj.model || '',
      analysisResult: obj.analysisResult ? JSON.parse(JSON.stringify(obj.analysisResult)) : { rep: [] },
      markdownContent: obj.markdownContent || '',
      tokenUsage: obj.tokenUsage ? JSON.parse(JSON.stringify(obj.tokenUsage)) : null,
    };
  }
}

// 保存文件路径信息到 localStorage
function saveFilePathToLocalStorage(recordId: string, filePath: string): void {
  try {
    const key = `history_file_path_${recordId}`;
    localStorage.setItem(key, filePath);
    console.log('[历史记录] 文件路径已保存到 localStorage:', key);
  } catch (error) {
    console.error('[历史记录] 保存文件路径到 localStorage 失败:', error);
  }
}

// 从 localStorage 获取文件路径信息
export function getFilePathFromLocalStorage(recordId: string): string | null {
  try {
    const key = `history_file_path_${recordId}`;
    return localStorage.getItem(key);
  } catch (error) {
    console.error('[历史记录] 从 localStorage 获取文件路径失败:', error);
    return null;
  }
}

// 从 localStorage 删除文件路径信息
function removeFilePathFromLocalStorage(recordId: string): void {
  try {
    const key = `history_file_path_${recordId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('[历史记录] 删除文件路径失败:', error);
  }
}

// 尝试从文件句柄获取路径信息（如果可能）
async function getFilePathFromHandle(fileHandle: FileSystemFileHandle | null): Promise<string | null> {
  if (!fileHandle) {
    return null;
  }

  try {
    // File System Access API 不直接提供文件路径
    // 但我们可以尝试获取文件名和目录信息
    const file = await fileHandle.getFile();
    // 注意：浏览器出于安全考虑，不允许直接访问完整路径
    // 我们只能获取文件名，无法获取完整路径
    return file.name; // 只返回文件名，不是完整路径
  } catch (error) {
    console.warn('[历史记录] 无法获取文件路径信息:', error);
    return null;
  }
}

// 保存历史记录
export async function saveHistoryRecord(
  videoFile: File,
  fileHandle: FileSystemFileHandle | null,
  model: string,
  analysisResult: VideoAnalysisResponse,
  markdownContent: string,
  tokenUsage: TokenUsage | null,
  videoDuration: string
): Promise<string> {
  const database = await initHistoryDB();

  const recordId = generateId();
  
  // 尝试获取文件路径信息（实际上只能获取文件名）
  const filePath = await getFilePathFromHandle(fileHandle);
  
  // FileSystemFileHandle 无法被 IndexedDB 序列化，所以不存储文件句柄
  // 将文件路径信息（文件名）保存到 localStorage
  const record: HistoryRecord = {
    id: recordId,
    timestamp: new Date().toISOString(),
    videoName: videoFile.name,
    videoSize: videoFile.size,
    videoDuration,
    videoFormat: videoFile.name.split('.').pop()?.toUpperCase() || 'MP4',
    fileHandle: null, // 不存储文件句柄，因为无法序列化
    filePath: filePath || videoFile.name, // 存储文件名作为路径提示
    model,
    analysisResult,
    markdownContent,
    tokenUsage,
  };

  // 保存文件路径信息到 localStorage
  if (record.filePath) {
    saveFilePathToLocalStorage(recordId, record.filePath);
  }

  // 如果有文件句柄，保存到内存缓存和 IndexedDB 中
  if (fileHandle) {
    fileHandleCache.set(recordId, fileHandle);
    console.log('[历史记录] 文件句柄已保存到内存缓存:', recordId);
    
    // 尝试将文件句柄保存到 IndexedDB（使用 structuredClone）
    try {
      await saveFileHandleToIndexedDB(recordId, fileHandle);
      console.log('[历史记录] 文件句柄已保存到 IndexedDB:', recordId);
    } catch (error) {
      console.warn('[历史记录] 文件句柄无法保存到 IndexedDB（可能不支持序列化）:', error);
      // 如果无法序列化，至少保存到内存缓存
    }
  }

  // 清理对象，确保可以被 IndexedDB 序列化
  const sanitizedRecord = sanitizeForIndexedDB(record) as HistoryRecord;

  // 测试序列化（用于调试）
  try {
    const testSerialized = JSON.stringify(sanitizedRecord);
    console.log('[历史记录] 序列化测试成功，大小:', testSerialized.length);
  } catch (serializeError) {
    console.error('[历史记录] 序列化测试失败:', serializeError);
    // 尝试找出问题对象
    try {
      JSON.stringify(sanitizedRecord.analysisResult);
    } catch (e) {
      console.error('[历史记录] analysisResult 序列化失败:', e);
    }
    try {
      JSON.stringify(sanitizedRecord.tokenUsage);
    } catch (e) {
      console.error('[历史记录] tokenUsage 序列化失败:', e);
    }
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    const request = objectStore.put(sanitizedRecord);

    request.onsuccess = () => {
      console.log('[历史记录] 保存成功:', record.id);
      resolve(record.id);
    };

    request.onerror = (event) => {
      console.error('[历史记录] 保存失败:', event);
      const error = (event.target as IDBRequest)?.error;
      console.error('[历史记录] 错误详情:', error);
      console.error('[历史记录] 尝试保存的记录:', JSON.stringify(sanitizedRecord, null, 2));
      reject(new Error('保存历史记录失败: ' + (error?.message || '未知错误')));
    };
  });
}

// 获取所有历史记录（不包含文件句柄，用于列表展示）
export async function getAllHistoryRecords(): Promise<HistoryRecordItem[]> {
  const database = await initHistoryDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const index = objectStore.index('timestamp');
    
    // 按时间戳倒序排列
    const request = index.openCursor(null, 'prev');

    const records: HistoryRecordItem[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const record = cursor.value as HistoryRecord;
        records.push({
          id: record.id,
          timestamp: record.timestamp,
          videoName: record.videoName,
          videoSize: record.videoSize,
          videoDuration: record.videoDuration,
          videoFormat: record.videoFormat,
          model: record.model,
          sceneCount: record.analysisResult.rep.length,
          tokenUsage: record.tokenUsage,
        });
        cursor.continue();
      } else {
        resolve(records);
      }
    };

    request.onerror = () => {
      reject(new Error('获取历史记录失败'));
    };
  });
}

// 根据ID获取完整历史记录（包含文件句柄）
export async function getHistoryRecordById(id: string): Promise<HistoryRecord | null> {
  const database = await initHistoryDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get(id);

    request.onsuccess = () => {
      const record = request.result as HistoryRecord | undefined;
      resolve(record || null);
    };

    request.onerror = () => {
      reject(new Error('获取历史记录失败'));
    };
  });
}

// 删除历史记录
export async function deleteHistoryRecord(id: string): Promise<void> {
  const database = await initHistoryDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.delete(id);

    request.onsuccess = () => {
      console.log('[历史记录] 删除成功:', id);
      // 同时删除 localStorage 中的文件路径信息
      removeFilePathFromLocalStorage(id);
      // 同时删除内存缓存中的文件句柄
      removeFileHandleFromCache(id);
      // 同时删除 IndexedDB 中的文件句柄
      removeFileHandleFromIndexedDB(id).catch(() => {
        // 忽略错误
      });
      resolve();
    };

    request.onerror = () => {
      reject(new Error('删除历史记录失败'));
    };
  });
}

// 清空所有历史记录
export async function clearAllHistory(): Promise<void> {
  const database = await initHistoryDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.clear();

    request.onsuccess = () => {
      console.log('[历史记录] 清空成功');
      // 清空所有 localStorage 中的文件路径信息
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('history_file_path_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.error('[历史记录] 清空 localStorage 文件路径失败:', error);
      }
      resolve();
    };

    request.onerror = () => {
      reject(new Error('清空历史记录失败'));
    };
  });
}

// 获取历史记录数量
export async function getHistoryCount(): Promise<number> {
  const database = await initHistoryDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('获取历史记录数量失败'));
    };
  });
}

// 更新历史记录的文件句柄（当文件句柄失效时）
export async function updateHistoryRecordFileHandle(
  id: string,
  fileHandle: FileSystemFileHandle | null
): Promise<void> {
  const database = await initHistoryDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const getRequest = objectStore.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result as HistoryRecord;
      if (!record) {
        reject(new Error('历史记录不存在'));
        return;
      }

      record.fileHandle = fileHandle;
      const updateRequest = objectStore.put(record);

      updateRequest.onsuccess = () => {
        console.log('[历史记录] 文件句柄更新成功:', id);
        resolve();
      };

      updateRequest.onerror = () => {
        reject(new Error('更新文件句柄失败'));
      };
    };

    getRequest.onerror = () => {
      reject(new Error('获取历史记录失败'));
    };
  });
}

