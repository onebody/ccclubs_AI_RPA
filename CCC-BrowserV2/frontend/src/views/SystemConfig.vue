<template>
  <div class="system-config">
    <Sidebar />
    <div class="main-content">
      <Header />
      <div class="content-body">
        <el-card>
          <template #header>
            <span>系统配置</span>
          </template>
          <el-tabs v-model="activeTab">
            <el-tab-pane label="引擎配置" name="engine">
              <el-form :model="engineConfig" label-width="150px">
                <el-form-item label="最大并发任务数">
                  <el-input-number v-model="engineConfig.maxConcurrentTasks" :min="1" :max="100" />
                </el-form-item>
                <el-form-item label="超时时间(ms)">
                  <el-input-number v-model="engineConfig.timeout" :min="1000" :max="300000" />
                </el-form-item>
                <el-form-item label="会话超时时间(min)">
                  <el-input-number v-model="engineConfig.sessionTimeout" :min="1" :max="120" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="saveEngineConfig">保存配置</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
            <el-tab-pane label="队列配置" name="queue">
              <el-form :model="queueConfig" label-width="150px">
                <el-form-item label="重试次数">
                  <el-input-number v-model="queueConfig.maxAttempts" :min="1" :max="10" />
                </el-form-item>
                <el-form-item label="重试延迟(ms)">
                  <el-input-number v-model="queueConfig.retryDelay" :min="100" :max="10000" />
                </el-form-item>
                <el-form-item label="并发处理数">
                  <el-input-number v-model="queueConfig.concurrency" :min="1" :max="20" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="saveQueueConfig">保存配置</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
            <el-tab-pane label="风控配置" name="stealth">
              <el-form :model="stealthConfig" label-width="150px">
                <el-form-item label="启用指纹伪装">
                  <el-switch v-model="stealthConfig.enabled" />
                </el-form-item>
                <el-form-item label="Canvas指纹">
                  <el-switch v-model="stealthConfig.canvas" />
                </el-form-item>
                <el-form-item label="WebGL指纹">
                  <el-switch v-model="stealthConfig.webgl" />
                </el-form-item>
                <el-form-item label="字体指纹">
                  <el-switch v-model="stealthConfig.fonts" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="saveStealthConfig">保存配置</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import Sidebar from '../components/Sidebar.vue';
import Header from '../components/Header.vue';

const activeTab = ref('engine');

const engineConfig = reactive({
  maxConcurrentTasks: 10,
  timeout: 30000,
  sessionTimeout: 30,
});

const queueConfig = reactive({
  maxAttempts: 3,
  retryDelay: 1000,
  concurrency: 5,
});

const stealthConfig = reactive({
  enabled: true,
  canvas: true,
  webgl: true,
  fonts: true,
});

const saveEngineConfig = () => {
  ElMessage.success('引擎配置已保存');
};

const saveQueueConfig = () => {
  ElMessage.success('队列配置已保存');
};

const saveStealthConfig = () => {
  ElMessage.success('风控配置已保存');
};
</script>

<style scoped>
.system-config {
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
</style>