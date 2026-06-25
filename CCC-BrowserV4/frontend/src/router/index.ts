import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/pages/HomePage.vue'),
      },
      // 后续功能页面在此追加
      {
        path: 'sites',
        name: 'Sites',
        component: () => import('@/pages/SitePage.vue'),
      },
      // { path: 'tasks', name: 'Tasks', component: () => import('@/pages/TaskPage.vue') },
      // { path: 'settings', name: 'Settings', component: () => import('@/pages/SettingsPage.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    // 未登录，重定向到登录页
    next('/login')
  } else if (to.path === '/login' && authStore.isLoggedIn) {
    // 已登录访问登录页，重定向到首页
    next('/')
  } else {
    next()
  }
})

export default router
