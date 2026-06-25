<template>
  <div class="process-template">
    <Sidebar />
    <div class="main-content">
      <Header />
      <div class="content-body">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>流程模板管理</span>
              <el-button type="primary" @click="showCreateDialog = true">新建模板</el-button>
            </div>
          </template>
          <el-table :data="templates" stripe>
            <el-table-column prop="id" label="模板ID" width="150" />
            <el-table-column prop="name" label="模板名称" />
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="status" label="状态">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'active' ? 'success' : 'info'">{{ scope.row.status === 'active' ? '启用' : '禁用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" />
            <el-table-column label="操作" width="200">
              <template #default="scope">
                <el-button size="small" @click="editTemplate(scope.row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteTemplate(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </div>
    <el-dialog v-model="showCreateDialog" :title="editingTemplate ? '编辑模板' : '新建模板'" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="'active'" :inactive-value="'disabled'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import Sidebar from '../components/Sidebar.vue';
import Header from '../components/Header.vue';
import { processConfigApi } from '../api';

const templates = ref([]);
const showCreateDialog = ref(false);
const editingTemplate = ref(null);
const formRef = ref(null);

const form = reactive({
  name: '',
  description: '',
  status: 'active',
});

const rules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
};

const loadTemplates = async () => {
  try {
    templates.value = await processConfigApi.getAll();
  } catch (error) {
    ElMessage.error('加载模板失败');
  }
};

loadTemplates();

const editTemplate = (template) => {
  editingTemplate.value = template;
  form.name = template.name;
  form.description = template.description;
  form.status = template.status;
  showCreateDialog.value = true;
};

const deleteTemplate = async (template) => {
  try {
    await processConfigApi.delete(template.id);
    ElMessage.success('删除成功');
    loadTemplates();
  } catch (error) {
    ElMessage.error('删除失败');
  }
};

const saveTemplate = async () => {
  if (!formRef.value) return;
  const valid = await formRef.value.validate();
  if (!valid) return;

  try {
    if (editingTemplate.value) {
      await processConfigApi.update(editingTemplate.value.id, form);
      ElMessage.success('更新成功');
    } else {
      await processConfigApi.create(form);
      ElMessage.success('创建成功');
    }
    showCreateDialog.value = false;
    editingTemplate.value = null;
    form.name = '';
    form.description = '';
    form.status = 'active';
    loadTemplates();
  } catch (error) {
    ElMessage.error('保存失败');
  }
};
</script>

<style scoped>
.process-template {
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
</style>