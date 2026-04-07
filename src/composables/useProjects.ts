import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import type { VideoScriptItem } from '@/types/video'
import type { ProjectCanvasNode, ProjectCanvasState } from '@/projects/types'

export type ProjectSourceType = 'manual' | 'analyze' | 'create' | 'reference'
export type ProjectSnapshotType = 'initial_import' | 'autosave' | 'manual_save' | 'published'

export interface ProjectRecord {
  id: string
  user_id: string
  title: string
  description: string
  source_type: ProjectSourceType
  source_ref_id: string
  status: 'draft' | 'active' | 'archived'
  storage_provider: string
  thumbnail_url: string
  current_snapshot_version: number
  node_count: number
  asset_count: number
  project_meta: Record<string, unknown>
  last_opened_at: string
  created_at: string
  updated_at: string
}

export interface ProjectSnapshotRecord {
  id: string
  project_id: string
  user_id: string
  version: number
  snapshot_type: ProjectSnapshotType
  title: string
  canvas_state: ProjectCanvasState
  summary: Record<string, unknown>
  node_count: number
  asset_count: number
  created_at: string
}

export interface ProjectShareRecord {
  id: string
  user_id: string
  project_id: string
  snapshot_id: string | null
  share_token: string
  title: string
  summary: string
  visibility: 'public' | 'unlisted'
  is_enabled: boolean
  allow_duplicate: boolean
  expires_at: string | null
  share_payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface CreateProjectFromScriptParams {
  title?: string
  sourceType: Exclude<ProjectSourceType, 'manual'>
  sourceRefId?: string
  scriptItems: VideoScriptItem[]
}

const projects = ref<ProjectRecord[]>([])
const loading = ref(false)

function createShareToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function getDefaultProjectTitle(sourceType: ProjectSourceType): string {
  const dateLabel = new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  if (sourceType === 'analyze') return `拆解项目 ${dateLabel}`
  if (sourceType === 'create') return `创作项目 ${dateLabel}`
  if (sourceType === 'reference') return `参考项目 ${dateLabel}`
  return `空白项目 ${dateLabel}`
}

function createScriptNode(item: VideoScriptItem, index: number): ProjectCanvasNode {
  const rowHeight = 260
  return {
    id: `script_${Date.now()}_${index}`,
    type: 'script',
    x: 80,
    y: 80 + index * rowHeight,
    width: 420,
    height: 220,
    data: {
      sequenceNumber: item.sequenceNumber,
      shotType: item.shotType,
      cameraMovement: item.cameraMovement,
      visualContent: item.visualContent,
      voiceover: item.voiceover,
      duration: item.duration,
      startTime: item.startTime,
      endTime: item.endTime,
    },
  }
}

function buildCanvasStateFromScriptItems(items: VideoScriptItem[]): ProjectCanvasState {
  const nodes = items.map(createScriptNode)
  return {
    nodes,
    viewport: {
      x: 40,
      y: 40,
      zoom: 1,
    },
  }
}

function buildEmptyCanvasState(): ProjectCanvasState {
  return {
    nodes: [],
    viewport: {
      x: 40,
      y: 40,
      zoom: 1,
    },
  }
}

export function useProjects() {
  const auth = useAuth()
  const hasProjects = computed(() => projects.value.length > 0)

  async function loadProjects(searchText = '') {
    if (!auth.user.value) {
      projects.value = []
      return
    }

    loading.value = true
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })

      const keyword = searchText.trim()
      if (keyword) {
        query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
      }

      const { data, error } = await query
      if (error) throw error
      projects.value = (data as ProjectRecord[]) || []
    } catch (error) {
      console.error('加载项目失败:', error)
      projects.value = []
      throw error
    } finally {
      loading.value = false
    }
  }

  async function getProjectById(projectId: string): Promise<ProjectRecord> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error) throw error
    return data as ProjectRecord
  }

  async function getLatestSnapshot(projectId: string): Promise<ProjectSnapshotRecord | null> {
    const { data, error } = await supabase
      .from('project_snapshots')
      .select('*')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as ProjectSnapshotRecord | null
  }

  async function createEmptyProject(title?: string): Promise<{ projectId: string; snapshotId: string }> {
    if (!auth.user.value) {
      throw new Error('请先登录')
    }

    const projectTitle = title?.trim() || getDefaultProjectTitle('manual')
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: auth.user.value.id,
        title: projectTitle,
        source_type: 'manual',
        current_snapshot_version: 1,
        node_count: 0,
      })
      .select('*')
      .single()

    if (projectError) throw projectError

    const emptyCanvasState = buildEmptyCanvasState()
    const { data: snapshot, error: snapshotError } = await supabase
      .from('project_snapshots')
      .insert({
        project_id: project.id,
        user_id: auth.user.value.id,
        version: 1,
        snapshot_type: 'manual_save',
        title: '初始空白快照',
        canvas_state: emptyCanvasState,
        node_count: 0,
        asset_count: 0,
      })
      .select('*')
      .single()

    if (snapshotError) throw snapshotError

    return {
      projectId: project.id,
      snapshotId: snapshot.id,
    }
  }

  async function createProjectFromScript(params: CreateProjectFromScriptParams): Promise<{ projectId: string; snapshotId: string }> {
    if (!auth.user.value) {
      throw new Error('请先登录')
    }
    if (!params.scriptItems.length) {
      throw new Error('当前没有可导入的脚本数据')
    }

    const projectTitle = params.title?.trim() || getDefaultProjectTitle(params.sourceType)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: auth.user.value.id,
        title: projectTitle,
        source_type: params.sourceType,
        source_ref_id: params.sourceRefId || '',
        current_snapshot_version: 1,
        node_count: params.scriptItems.length,
      })
      .select('*')
      .single()

    if (projectError) throw projectError

    const canvasState = buildCanvasStateFromScriptItems(params.scriptItems)
    const { data: snapshot, error: snapshotError } = await supabase
      .from('project_snapshots')
      .insert({
        project_id: project.id,
        user_id: auth.user.value.id,
        version: 1,
        snapshot_type: 'initial_import',
        title: '脚本导入快照',
        canvas_state: canvasState,
        summary: {
          importedScriptCount: params.scriptItems.length,
          sourceType: params.sourceType,
        },
        node_count: params.scriptItems.length,
        asset_count: 0,
      })
      .select('*')
      .single()

    if (snapshotError) throw snapshotError

    return {
      projectId: project.id,
      snapshotId: snapshot.id,
    }
  }

  async function saveProjectSnapshot(projectId: string, payload: {
    title?: string
    canvasState: ProjectCanvasState
    snapshotType?: ProjectSnapshotType
  }) {
    if (!auth.user.value) {
      throw new Error('请先登录')
    }

    const project = await getProjectById(projectId)
    const nextVersion = (project.current_snapshot_version || 0) + 1
    const nodeCount = payload.canvasState.nodes.length

    const { data: snapshot, error: snapshotError } = await supabase
      .from('project_snapshots')
      .insert({
        project_id: projectId,
        user_id: auth.user.value.id,
        version: nextVersion,
        snapshot_type: payload.snapshotType || 'manual_save',
        title: payload.title || `快照 ${nextVersion}`,
        canvas_state: payload.canvasState,
        node_count: nodeCount,
      })
      .select('*')
      .single()

    if (snapshotError) throw snapshotError

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        current_snapshot_version: nextVersion,
        node_count: nodeCount,
        last_opened_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    if (updateError) throw updateError
    return snapshot as ProjectSnapshotRecord
  }

  async function getProjectShare(projectId: string): Promise<ProjectShareRecord | null> {
    if (!auth.user.value) {
      throw new Error('请先登录')
    }

    const { data, error } = await supabase
      .from('project_shares')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', auth.user.value.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as ProjectShareRecord | null
  }

  async function publishProjectShare(projectId: string, payload: {
    title?: string
    summary?: string
    snapshotId?: string | null
    sharePayload: Record<string, unknown>
    expiresAt?: string | null
  }): Promise<ProjectShareRecord> {
    if (!auth.user.value) {
      throw new Error('请先登录')
    }

    const existingShare = await getProjectShare(projectId)
    const nextData = {
      title: payload.title || '项目分享',
      summary: payload.summary || '',
      snapshot_id: payload.snapshotId || null,
      is_enabled: true,
      expires_at: payload.expiresAt || null,
      share_payload: payload.sharePayload,
    }

    if (existingShare) {
      const { data, error } = await supabase
        .from('project_shares')
        .update(nextData)
        .eq('id', existingShare.id)
        .select('*')
        .single()

      if (error) throw error
      return data as ProjectShareRecord
    }

    const { data, error } = await supabase
      .from('project_shares')
      .insert({
        user_id: auth.user.value.id,
        project_id: projectId,
        share_token: createShareToken(),
        visibility: 'public',
        ...nextData,
      })
      .select('*')
      .single()

    if (error) throw error
    return data as ProjectShareRecord
  }

  return {
    projects,
    loading,
    hasProjects,
    loadProjects,
    getProjectById,
    getLatestSnapshot,
    createEmptyProject,
    createProjectFromScript,
    saveProjectSnapshot,
    getProjectShare,
    publishProjectShare,
  }
}
