<template>
  <el-dialog
    v-model="executionStore.isVisible"
    title="任务执行"
    width="520px"
    :close-on-click-modal="false"
    @close="executionStore.close"
  >
    <!-- checking_login -->
    <div v-if="executionStore.step === 'checking_login'" class="step-content">
      <div class="loading-wrapper">
        <el-icon class="is-loading" :size="40" color="#409eff"><Loading /></el-icon>
        <p class="step-message">正在检查登录状态...</p>
      </div>
    </div>

    <!-- qr_scanning -->
    <div v-else-if="executionStore.step === 'qr_scanning'" class="step-content">
      <div class="qr-wrapper">
        <div class="qr-image-box">
          <img
            v-if="executionStore.qrImage"
            :src="executionStore.qrImage"
            alt="登录二维码"
            class="qr-image"
          />
        </div>
        <p class="qr-hint-primary">请使用交管12123 APP扫描二维码</p>
        <p class="qr-hint-secondary">打开交管12123 APP → 点击「扫一扫」→ 扫描上方二维码</p>
        <el-button type="primary" @click="executionStore.doScanComplete()" style="margin-top: 16px;">
          我已完成扫码
        </el-button>
      </div>
    </div>

    <!-- waiting_company -->
    <div v-else-if="executionStore.step === 'waiting_company'" class="step-content">
      <p class="company-title">请选择要办理业务的单位</p>
      <div class="company-list">
        <div
          v-for="company in executionStore.companies"
          :key="company.id"
          class="company-card"
          :class="{ selected: localSelectedCompany?.id === company.id }"
          @click="localSelectedCompany = company"
        >
          <div class="company-card-inner">
            <el-icon :size="28" color="#909399"><OfficeBuilding /></el-icon>
            <div class="company-info">
              <div class="company-name">{{ company.name }}</div>
              <div class="company-code">{{ company.creditCode }}</div>
            </div>
            <el-icon v-if="localSelectedCompany?.id === company.id" :size="20" color="#409eff"><Check /></el-icon>
          </div>
        </div>
      </div>
      <div class="company-action">
        <el-button
          type="primary"
          :disabled="!localSelectedCompany"
          @click="executionStore.doSelectCompany(localSelectedCompany!)"
        >
          确认选择
        </el-button>
      </div>
    </div>

    <!-- executing -->
    <div v-else-if="executionStore.step === 'executing'" class="step-content">
      <el-steps :active="executingActive" finish-status="success" align-center style="margin-bottom: 24px;">
        <el-step title="登录" />
        <el-step title="选择单位" />
        <el-step title="执行任务" />
      </el-steps>
      <div class="loading-wrapper">
        <el-icon class="is-loading" :size="32" color="#409eff"><Loading /></el-icon>
        <p class="step-message">{{ executionStore.message || '正在执行...' }}</p>
      </div>
    </div>

    <!-- completed -->
    <div v-else-if="executionStore.step === 'completed'" class="step-content">
      <el-result icon="success" :title="executionStore.message || '执行完成'">
        <template #extra>
          <el-button type="primary" @click="executionStore.close()">关闭</el-button>
        </template>
      </el-result>
    </div>

    <!-- failed -->
    <div v-else-if="executionStore.step === 'failed'" class="step-content">
      <el-result icon="error" :title="executionStore.message || '执行失败'">
        <template #extra>
          <el-button type="primary" @click="executionStore.close()">关闭</el-button>
        </template>
      </el-result>
    </div>

    <!-- cancelled -->
    <div v-else-if="executionStore.step === 'cancelled'" class="step-content">
      <el-result icon="warning" title="已取消执行">
        <template #extra>
          <el-button type="primary" @click="executionStore.close()">关闭</el-button>
        </template>
      </el-result>
    </div>

    <!-- footer: cancel button for active steps -->
    <template #footer>
      <div class="dialog-footer">
        <el-button
          v-if="showCancelButton"
          type="danger"
          plain
          @click="executionStore.doCancel()"
        >
          取消执行
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Loading, OfficeBuilding, Check } from '@element-plus/icons-vue'
import { useExecutionStore } from '../stores/execution'
import type { CompanyInfo } from '../types/execution'

const executionStore = useExecutionStore()

const localSelectedCompany = ref<CompanyInfo | null>(null)

// 当进入 waiting_company 步骤时重置本地选择
watch(() => executionStore.step, (newStep) => {
  if (newStep === 'waiting_company') {
    localSelectedCompany.value = null
  }
})

const executingActive = computed(() => {
  const s = executionStore.step
  if (s === 'executing') return 2
  return 0
})

const showCancelButton = computed(() => {
  const activeSteps = ['checking_login', 'qr_scanning', 'waiting_company', 'executing']
  return activeSteps.includes(executionStore.step)
})
</script>

<style scoped>
.step-content {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 16px;
}

.step-message {
  font-size: 15px;
  color: #606266;
  margin: 0;
}

/* QR code */
.qr-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
}

.qr-image-box {
  width: 240px;
  height: 240px;
  border: 2px solid #dcdfe6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #fff;
  animation: pulse 2s ease-in-out infinite;
}

.qr-image {
  width: 220px;
  height: 220px;
  object-fit: contain;
}

@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.3); }
  50% { opacity: 0.85; box-shadow: 0 0 12px 4px rgba(64, 158, 255, 0.15); }
}

.qr-hint-primary {
  margin-top: 16px;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.qr-hint-secondary {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}

/* Company list */
.company-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 16px 0;
  align-self: flex-start;
}

.company-list {
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.company-card {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
}

.company-card:hover {
  border-color: #c0c4cc;
  background: #fafafa;
}

.company-card.selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.company-card-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}

.company-info {
  flex: 1;
  min-width: 0;
}

.company-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.company-code {
  font-size: 12px;
  color: #909399;
  font-family: monospace;
  margin-top: 4px;
}

.company-action {
  margin-top: 20px;
}

/* Footer */
.dialog-footer {
  display: flex;
  justify-content: center;
}
</style>
