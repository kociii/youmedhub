import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'analysis',
      component: () => import('@/views/AnalysisView.vue')
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/AdminLoginView.vue')
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresAuth: true, isAdmin: true }
    }
  ]
})

// 路由守卫
router.beforeEach((to) => {
  const token = localStorage.getItem('admin_token')

  // 如果访问管理后台页面但没有token，重定向到登录页
  if (to.meta?.isAdmin && !token) {
    return {
      path: '/admin/login',
      query: { redirect: to.fullPath }
    }
  }

  // 如果已登录但访问登录页，重定向到管理后台
  if (to.name === 'admin-login' && token) {
    return '/admin'
  }
})

export default router
