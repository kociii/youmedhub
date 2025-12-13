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
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue')
    }
  ]
})

export default router
