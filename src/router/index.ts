import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      components: {
        default: () => import('@/views/HomePage.vue'),
      },
      meta: { title: '首页' },
    },
    {
      path: '/analyze',
      name: 'analyze',
      components: {
        default: () => import('@/views/AnalyzePage.vue'),
        config: () => import('@/components/LeftPanel.vue'),
      },
      meta: { title: '视频脚本解析', hasConfig: true, requiresAuth: false },
    },
    {
      path: '/create',
      name: 'create',
      components: {
        default: () => import('@/views/CreatePage.vue'),
        config: () => import('@/components/LeftPanel.vue'),
      },
      meta: { title: '脚本生成', hasConfig: true, requiresAuth: false },
    },
    {
      path: '/favorites',
      name: 'favorites',
      components: {
        default: () => import('@/views/FavoritesPage.vue'),
      },
      meta: { title: '我的收藏', requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      components: {
        default: () => import('@/views/SettingsPage.vue'),
      },
      meta: { title: '设置' },
    },
    {
      path: '/profile',
      name: 'profile',
      components: {
        default: () => import('@/views/ProfilePage.vue'),
      },
      meta: { title: '个人中心', requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      components: {
        default: () => import('@/views/LoginPage.vue'),
      },
      meta: { title: '登录' },
    },
  ],
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  // 设置页面标题
  document.title = `${to.meta.title || 'YouMedHub'} - YouMedHub`

  // 检查登录状态
  if (to.meta.requiresAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      next({ name: 'login', query: { redirect: to.fullPath } })
      return
    }
  }

  next()
})

export default router
