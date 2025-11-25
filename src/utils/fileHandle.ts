// 文件句柄工具 - 用于获取和管理文件句柄

// 使用 File System Access API 获取文件句柄
export async function getFileHandleFromPicker(): Promise<FileSystemFileHandle | null> {
  if (!('showOpenFilePicker' in window)) {
    console.warn('[文件句柄] 浏览器不支持 File System Access API');
    return null;
  }

  try {
    const [fileHandle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: '视频文件',
          accept: {
            'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv'],
          },
        },
      ],
      multiple: false,
    });

    return fileHandle;
  } catch (error) {
    // 用户取消选择
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    console.error('[文件句柄] 获取文件句柄失败:', error);
    throw error;
  }
}

// 从文件句柄获取 File 对象
export async function getFileFromHandle(
  fileHandle: FileSystemFileHandle
): Promise<File> {
  try {
    return await fileHandle.getFile();
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundError') {
      throw new Error('文件已被移动或删除，请重新选择文件');
    }
    throw error;
  }
}

// 检查文件句柄是否有效
export async function isFileHandleValid(
  fileHandle: FileSystemFileHandle | null
): Promise<boolean> {
  if (!fileHandle) {
    return false;
  }

  try {
    await fileHandle.getFile();
    return true;
  } catch {
    return false;
  }
}

