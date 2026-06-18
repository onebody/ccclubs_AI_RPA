import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
    },
    {
      path: '/',
      name: 'Layout',
      component: () => import('@/layout/Layout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: '/dashboard',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
        },
        {
          path: '/tenants',
          name: 'Tenants',
          component: () => import('@/views/Tenants.vue'),
        },
        {
          path: '/sessions',
          name: 'Sessions',
          component: () => import('@/views/Sessions.vue'),
        },
        {
          path: '/tasks',
          name: 'Tasks',
          component: () => import('@/views/Tasks.vue'),
        },
        {
          path: '/users',
          name: 'Users',
          component: () => import('@/views/Users.vue'),
        },
        {
          path: '/audit',
          name: 'Audit',
          component: () => import('@/views/Audit.vue'),
        },
        {
          path: '/stats',
          name: 'Stats',
          component: () => import('@/views/Stats.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  if (to.path !== '/login' && !authStore.token) {
    return { name: 'Login' }
  }
})

export default router