import * as XLSX from 'xlsx';
import type { VideoScriptItem } from '../types/video';

export function exportToExcel(items: VideoScriptItem[] | undefined, filename = '视频分析结果') {
  if (!items?.length) return;
  const data = items.map(item => ({
    '序号': item.sequenceNumber,
    '景别': item.shotType,
    '运镜方式': item.cameraMovement,
    '画面内容': item.visualContent,
    '画面文案': item.onScreenText,
    '口播/台词': item.voiceover,
    '音效/BGM': item.audio,
    '开始时间': item.startTime,
    '结束时间': item.endTime,
    '时长': item.duration,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '分析结果');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
