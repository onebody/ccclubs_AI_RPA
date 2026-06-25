import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/Login.vue')
  },
  {
    path: '/tenants',
    name: 'tenants',
    component: () => import('@/views/tenant/TenantList.vue')
  },
  {
    path: '/processes',
    name: 'processes',
    component: () => import('@/views/process/ProcessList.vue')
  },
  {
    path: '/api-sources',
    name: 'api-sources',
    component: () => import('@/views/api-source/ApiSourceList.vue')
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: () => import('@/views/task/TaskList.vue')
  },
  {
    path: '/monitor',
    name: 'monitor',
    component: () => import('@/views/monitor/Monitor.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router