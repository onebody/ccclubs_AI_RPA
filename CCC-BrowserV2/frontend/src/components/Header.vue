<template>
  <header class="header">
    <div class="header-content">
      <div class="user-info">
        <el-dropdown>
          <span class="el-dropdown-link">
            <el-icon><component :is="User" /></el-icon>
            {{ user?.username || user?.phone }}
            <el-icon><component :is="ArrowDown" /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </header>
</template>

<script setup>
import { User, ArrowDown } from '@element-plus/icons-vue';
import { getUserInfo, logout } from '../utils/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const user = getUserInfo();

const handleLogout = () => {
  logout();
  router.push('/login');
};
</script>

<style scoped>
.header {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.header-content {
  display: flex;
  align-items: center;
}

.user-info {
  cursor: pointer;
}

.el-dropdown-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
}
</style>