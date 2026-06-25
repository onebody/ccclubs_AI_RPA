<template>
  <div class="login-recorder">
    <h1>登录流程录制</h1>
    <el-card>
      <el-form :model="form" label-width="100px">
        <el-form-item label="目标URL">
          <el-input v-model="form.targetUrl" placeholder="请输入需要登录的网站URL" />
        </el-form-item>
        <el-form-item>
          <el-button
            v-if="!isRecording"
            type="primary"
            :loading="loading"
            @click="startRecording"
          >
            开始录制
          </el-button>
          <el-button
            v-else
            type="danger"
            @click="stopRecording"
          >
            停止录制并保存登录态
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 二维码扫码面板 -->
    <el-dialog v-model="showQrPanel" title="请扫码登录" width="400px" :close-on-click-modal="false">
      <div class="qr-panel">
        <p>请使用手机扫描二维码完成登录</p>
        <div v-if="qrImage" class="qr-image">
          <img :src="qrImage" alt="二维码" />
        </div>
        <el-tag v-else type="warning">等待页面加载二维码...</el-tag>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { loginApi } from '@/api/tauri-api';

const form = ref({ targetUrl: '' });
const isRecording = ref(false);
const loading = ref(false);
const showQrPanel = ref(false);
const qrImage = ref('');
const currentSessionId = ref('');

/** 开始录制登录流程 */
async function startRecording(): Promise<void> {
  if (!form.value.targetUrl) return;
  loading.value = true;
  try {
    const result = await loginApi.startRecording({
      sessionId: '',
      targetUrl: form.value.targetUrl,
    }) as any;
    currentSessionId.value = result?.session_id || '';
    isRecording.value = true;
    showQrPanel.value = true;
  } catch (e) {
    console.error('启动录制失败:', e);
  } finally {
    loading.value = false;
  }
}

/** 停止录制并保存登录态 */
async function stopRecording(): Promise<void> {
  try {
    await loginApi.stopRecording({
      sessionId: currentSessionId.value,
    });
    isRecording.value = false;
    showQrPanel.value = false;
  } catch (e) {
    console.error('停止录制失败:', e);
  }
}
</script>

<style scoped>
.login-recorder {
  padding: 24px;
}
.qr-panel {
  text-align: center;
  padding: 20px;
}
.qr-image img {
  max-width: 256px;
  max-height: 256px;
}
</style>
