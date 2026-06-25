<template>
  <div class="task-management">
    <Sidebar />
    <div class="main-content">
      <Header />
      <div class="content-body">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>任务管理</span>
              <el-button type="primary" @click="showCreateDialog = true">创建任务</el-button>
            </div>
          </template>
          <div class="filter-bar">
            <el-select v-model="filterStatus" placeholder="状态筛选" style="width: 150px; margin-right: 10px">
              <el-option label="全部" value="" />
              <el-option label="待执行" value="pending" />
              <el-option label="执行中" value="running" />
              <el-option label="已完成" value="completed" />
              <el-option label="失败" value="failed" />
            </el-select>
            <el-button type="primary" @click="loadTasks">查询</el-button>
          </div>
          <el-table :data="tasks" stripe>
            <el-table-column prop="id" label="任务ID" width="150" />
            <el-table-column prop="name" label="任务名称" />
            <el-table-column prop="status" label="状态">
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="progress" label="进度">
              <template #default="scope">
                <el-progress :percentage="scope.row.progress || 0" :stroke-width="8" />
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" />
            <el-table-column prop="updatedAt" label="更新时间" />
            <el-table-column label="操作" width="250">
              <template #default="scope">
                <el-button size="small" v-if="scope.row.status === 'pending'" @click="executeTask(scope.row)">执行</el-button>
                <el-button size="small" @click="viewTask(scope.row)">查看详情</el-button>
                <el-button size="small" type="danger" @click="deleteTask(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </div>
    <el-dialog v-model="showCreateDialog" title="创建任务" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="关联模板">
          <el-select v-model="form.templateId" placeholder="请选择流程模板">
            <el-option v-for="tpl in templates" :key="tpl.id" :label="tpl.name" :value="tpl.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行参数">
          <el-input v-model="form.params" type="textarea" placeholder="JSON格式参数" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createTask">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import Sidebar from '../components/Sidebar.vue';
import Header from '../components/Header.vue';
import { taskApi, processConfigApi } from '../api';

const tasks = ref([]);
const templates = ref([]);
const showCreateDialog = ref(false);
const filterStatus = ref('');
const formRef = ref(null);

const form = reactive({
  name: '',
  templateId: '',
  params: '{}',
});

const rules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
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

const loadTasks = async () => {
  try {
    tasks.value = await taskApi.getAll();
  } catch (error) {
    ElMessage.error('加载任务失败');
  }
};

const loadTemplates = async () => {
  try {
    templates.value = await processConfigApi.getAll();
  } catch (error) {
    ElMessage.error('加载模板失败');
  }
};

loadTasks();
loadTemplates();

const executeTask = async (task) => {
  try {
    await taskApi.execute(task.id);
    ElMessage.success('任务已加入队列');
    loadTasks();
  } catch (error) {
    ElMessage.error('执行任务失败');
  }
};

const viewTask = (task) => {
  ElMessage.info(`任务ID: ${task.id}`);
};

const deleteTask = async (task) => {
  try {
    await taskApi.delete(task.id);
    ElMessage.success('删除成功');
    loadTasks();
  } catch (error) {
    ElMessage.error('删除失败');
  }
};

const createTask = async () => {
  if (!formRef.value) return;
  const valid = await formRef.value.validate();
  if (!valid) return;

  try {
    await taskApi.create(form);
    ElMessage.success('创建成功');
    showCreateDialog.value = false;
    form.name = '';
    form.templateId = '';
    form.params = '{}';
    loadTasks();
  } catch (error) {
    ElMessage.error('创建失败');
  }
};
</script>

<style scoped>
.task-management {
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}
</style>