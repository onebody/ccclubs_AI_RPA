/**
 * Vue Router 路由配置
 */
import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
  },
  {
    path: '/tasks',
    name: 'TaskList',
    component: () => import('@/views/TaskList.vue'),
  },
  {
    path: '/login',
    name: 'LoginRecorder',
    component: () => import('@/views/LoginRecorder.vue'),
  },
  {
    path: '/flow',
    name: 'FlowEditor',
    component: () => import('@/views/FlowEditor.vue'),
  },
  {
    path: '/monitor',
    name: 'MonitorDashboard',
    component: () => import('@/views/MonitorDashboard.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
