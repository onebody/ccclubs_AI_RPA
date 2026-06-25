<template>
  <el-menu
    :default-active="activeIndex"
    class="side-menu"
    background-color="#304156"
    text-color="#bfcbd9"
    active-text-color="#409EFF"
    router
  >
    <div class="menu-header">
      <h3>CCC-Browser V4</h3>
    </div>
    
    <el-menu-item
      v-for="item in menuItems"
      :key="item.index"
      :index="item.index"
      @click="handleMenuClick(item)"
    >
      <el-icon><component :is="item.icon" /></el-icon>
      <span>{{ item.title }}</span>
    </el-menu-item>
  </el-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { MenuItem } from '@/types'

const route = useRoute()
const router = useRouter()

// 菜单项配置
const menuItems: MenuItem[] = [
  { index: '/login', icon: 'User', title: '用户登录' },
  { index: '/', icon: 'HomeFilled', title: '首页' },
  { index: '/tasks', icon: 'Timer', title: '站点任务' },
  // 后续追加功能菜单
  // { index: '/settings', icon: 'Setting', title: '设置' },
]

const activeIndex = computed(() => route.path)

const handleMenuClick = (item: MenuItem) => {
  if (item.index !== route.path) {
    router.push(item.index)
  }
}
</script>

<style scoped>
.side-menu {
  height: 100%;
  border-right: none;
}

.menu-header {
  padding: 20px;
  color: #fff;
  text-align: center;
  border-bottom: 1px solid #1f2d3d;
}

.menu-header h3 {
  margin: 0;
  font-size: 16px;
}
</style>
