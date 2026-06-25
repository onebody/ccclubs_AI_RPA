<template>
  <div class="task-list">
    <h1>任务管理</h1>
    <el-button type="primary" @click="showCreateDialog = true">新建任务</el-button>
    <el-table :data="tasks" style="margin-top: 16px" border>
      <el-table-column prop="name" label="任务名称" />
      <el-table-column prop="flow_type" label="流程类型" width="120" />
      <el-table-column prop="target_url" label="目标URL" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="executeTask(row.id)">执行</el-button>
          <el-button size="small" type="danger" @click="deleteTask(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建任务对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建任务" width="500px">
      <el-form :model="newTask" label-width="100px">
        <el-form-item label="任务名称">
          <el-input v-model="newTask.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="流程类型">
          <el-select v-model="newTask.flow_type" placeholder="请选择">
            <el-option label="登录流程" value="login" />
            <el-option label="业务流程" value="business" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标URL">
          <el-input v-model="newTask.target_url" placeholder="https://example.com" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createTask">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { taskApi } from '@/api/tauri-api';

interface Task {
  id: string;
  name: string;
  flow_type: string;
  target_url: string;
  created_at: string;
}

const tasks = ref<Task[]>([]);
const showCreateDialog = ref(false);
const newTask = ref({ name: '', flow_type: 'business', target_url: '' });

/** 加载任务列表 */
async function loadTasks(): Promise<void> {
  try {
    const result = await taskApi.list() as any;
    tasks.value = result?.data || [];
  } catch (e) {
    console.error('加载任务列表失败:', e);
  }
}

/** 创建任务 */
async function createTask(): Promise<void> {
  try {
    await taskApi.create(newTask.value);
    showCreateDialog.value = false;
    await loadTasks();
  } catch (e) {
    console.error('创建任务失败:', e);
  }
}

/** 执行任务 */
async function executeTask(taskId: string): Promise<void> {
  console.log('执行任务:', taskId);
}

/** 删除任务（占位） */
async function deleteTask(taskId: string): Promise<void> {
  console.log('删除任务:', taskId);
}

onMounted(() => {
  loadTasks();
});
</script>

<style scoped>
.task-list {
  padding: 24px;
}
</style>
