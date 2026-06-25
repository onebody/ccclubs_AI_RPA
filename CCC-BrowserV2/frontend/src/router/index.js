import { createRouter, createWebHistory } from 'vue-router';
import { getToken } from '../utils/auth';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/process-templates',
    name: 'ProcessTemplates',
    component: () => import('../views/ProcessTemplate.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('../views/TaskManagement.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('../views/SystemConfig.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !getToken()) {
    next({ name: 'Login' });
  } else if (to.name === 'Login' && getToken()) {
    next({ name: 'Dashboard' });
  } else {
    next();
  }
});

export default router;