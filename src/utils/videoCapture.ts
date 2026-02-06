// 解析时间字符串为秒数
// 支持格式：MM:SS, HH:MM:SS
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;

  const parts = timeStr.split(':').map(s => s.trim());

  if (parts.length === 2) {
    const minutes = parseInt(parts[0] || '0') || 0;
    const seconds = parseInt(parts[1] || '0') || 0;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    const hours = parseInt(parts[0] || '0') || 0;
    const minutes = parseInt(parts[1] || '0') || 0;
    const seconds = parseInt(parts[2] || '0') || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return 0;
}
