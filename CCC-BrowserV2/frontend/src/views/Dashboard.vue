<template>
  <div class="dashboard">
    <Sidebar />
    <div class="main-content">
      <Header />
      <div class="content-body">
        <div class="stats-cards">
          <el-card class="stat-card">
            <div class="stat-icon tasks">
              <el-icon><component :is="List" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.todayTasks }}</div>
              <div class="stat-label">今日任务</div>
            </div>
          </el-card>
          <el-card class="stat-card">
            <div class="stat-icon success">
              <el-icon><component :is="CircleCheck" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.successTasks }}</div>
              <div class="stat-label">成功完成</div>
            </div>
          </el-card>
          <el-card class="stat-card">
            <div class="stat-icon error">
              <el-icon><component :is="CircleClose" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.failedTasks }}</div>
              <div class="stat-label">失败任务</div>
            </div>
          </el-card>
          <el-card class="stat-card">
            <div class="stat-icon templates">
              <el-icon><component :is="Document" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.templates }}</div>
              <div class="stat-label">流程模板</div>
            </div>
          </el-card>
        </div>
        <div class="recent-tasks">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>最近任务</span>
                <el-button type="primary" size="small" @click="$router.push('/tasks')">查看全部</el-button>
              </div>
            </template>
            <el-table :data="recentTasks" stripe>
              <el-table-column prop="id" label="任务ID" width="150" />
              <el-table-column prop="name" label="任务名称" />
              <el-table-column prop="status" label="状态">
                <template #default="scope">
                  <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createdAt" label="创建时间" />
            </el-table>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { List, CircleCheck, CircleClose, Document } from '@element-plus/icons-vue';
import Sidebar from '../components/Sidebar.vue';
import Header from '../components/Header.vue';
import { taskApi, processConfigApi } from '../api';

const recentTasks = ref([]);
const stats = ref({
  todayTasks: 0,
  successTasks: 0,
  failedTasks: 0,
  templates: 0,
});

onMounted(() => {
  loadStats();
  loadTasks();
});

const loadStats = async () => {
  try {
    const tasks = await taskApi.getAll();
    const templates = await processConfigApi.getAll();
    
    const today = new Date().toDateString();
    
    stats.value = {
      todayTasks: tasks.filter(t => new Date(t.createdAt).toDateString() === today).length,
      successTasks: tasks.filter(t => t.status === 'completed').length,
      failedTasks: tasks.filter(t => t.status === 'failed').length,
      templates: templates.length,
    };
  } catch (error) {
    console.error('加载统计数据失败', error);
  }
};

const loadTasks = async () => {
  try {
    recentTasks.value = (await taskApi.getAll()).slice(0, 5);
  } catch (error) {
    console.error('加载任务失败', error);
  }
};

const getStatusType = (status) => {
  const types = {
    pending: 'info',
    running: 'warning',
    completed: 'success',
    failed: 'danger',
  };
  return types[status] || 'info';
};

const getStatusText = (status) => {
  const texts = {
    pending: '待执行',
    running: '执行中',
    completed: '已完成',
    failed: '失败',
  };
  return texts[status] || status;
};
</script>

<style scoped>
.dashboard {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  margin-left: 200px;
}

.content-body {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.tasks {
  background: #e6f7ff;
  color: #1890ff;
}

.stat-icon.success {
  background: #f6ffed;
  color: #52c41a;
}

.stat-icon.error {
  background: #fff2f0;
  color: #ff4d4f;
}

.stat-icon.templates {
  background: #f9f0ff;
  color: #722ed1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  color: #909399;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recent-tasks {
  margin-top: 20px;
}
</style>