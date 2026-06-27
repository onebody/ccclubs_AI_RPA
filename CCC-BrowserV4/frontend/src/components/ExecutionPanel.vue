<template>
  <div class="execution-inline">
    <!-- checking_login -->
    <div v-if="executionStore.step === 'checking_login'" class="step-content">
      <div class="loading-wrapper">
        <el-icon class="is-loading" :size="28" color="#409eff"><Loading /></el-icon>
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
        <div class="qr-actions">
          <el-button type="primary" size="small" @click="executionStore.doScanComplete()">
            我已完成扫码
          </el-button>
          <el-button type="danger" size="small" plain @click="executionStore.doCancel()">
            取消执行
          </el-button>
        </div>
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
            <el-icon :size="22" color="#909399"><OfficeBuilding /></el-icon>
            <div class="company-info">
              <div class="company-name">{{ company.name }}</div>
              <div class="company-code">{{ company.creditCode }}</div>
            </div>
            <el-icon v-if="localSelectedCompany?.id === company.id" :size="16" color="#409eff"><Check /></el-icon>
          </div>
        </div>
      </div>
      <div class="company-action">
        <el-button
          type="primary"
          size="small"
          :disabled="!localSelectedCompany"
          @click="executionStore.doSelectCompany(localSelectedCompany!)"
        >
          确认选择
        </el-button>
        <el-button type="danger" size="small" plain @click="executionStore.doCancel()">
          取消执行
        </el-button>
      </div>
    </div>

    <!-- executing / keeping_alive -->
    <div v-else-if="executionStore.step === 'executing' || executionStore.step === 'keeping_alive'" class="step-content">
      <div class="exec-status-row">
        <el-icon class="is-loading" :size="18" color="#409eff"><Loading /></el-icon>
        <span class="exec-status-text">
          {{ executionStore.step === 'keeping_alive' ? '页面保活中' : (executionStore.message || '正在执行...') }}
        </span>
        <el-button type="danger" size="small" plain @click="executionStore.doCancel()">
          取消执行
        </el-button>
      </div>
      <p v-if="executionStore.step === 'keeping_alive'" class="keeping-alive-detail">
        {{ executionStore.message }}
      </p>

      <!-- 子任务进度面板 -->
      <div v-if="executionStore.subTask" class="subtask-panel">
        <div class="subtask-header">
          <el-tag size="small" type="primary" effect="light">{{ executionStore.subTask.subTaskType }}</el-tag>
          <span class="subtask-step-label">{{ executionStore.subTask.message }}</span>
        </div>
        <el-progress
          :percentage="executionStore.subTask.progress"
          :stroke-width="10"
          striped
          striped-flow
          style="width: 100%; margin-top: 6px;"
        />
      </div>

      <!-- 子任务完成结果汇总（从历史最后一条 done 记录展示） -->
      <div
        v-if="!executionStore.subTask && lastDoneSubTask"
        class="subtask-result"
      >
        <div class="subtask-result-header">
          <el-tag size="small" type="success" effect="light">{{ lastDoneSubTask.subTaskType }} 完成</el-tag>
        </div>
        <div v-if="lastDoneSubTask.data" class="subtask-result-stats">
          <el-tag size="small" type="success">
            成功: {{ lastDoneSubTask.data.success_count ?? 0 }}
          </el-tag>
          <el-tag size="small" type="danger">
            失败: {{ lastDoneSubTask.data.fail_count ?? 0 }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- completed -->
    <div v-else-if="executionStore.step === 'completed'" class="step-content step-result">
      <el-icon :size="22" color="#67c23a"><SuccessFilled /></el-icon>
      <span class="result-text success-text">{{ executionStore.message || '执行完成' }}</span>
      <el-button type="primary" size="small" @click="executionStore.clearExecution()">关闭</el-button>
    </div>

    <!-- failed -->
    <div v-else-if="executionStore.step === 'failed'" class="step-content step-result">
      <el-icon :size="22" color="#f56c6c"><CircleCloseFilled /></el-icon>
      <span class="result-text failed-text">{{ executionStore.message || '执行失败' }}</span>
      <el-button type="primary" size="small" @click="executionStore.clearExecution()">关闭</el-button>
    </div>

    <!-- cancelled -->
    <div v-else-if="executionStore.step === 'cancelled'" class="step-content step-result">
      <el-icon :size="22" color="#e6a23c"><WarningFilled /></el-icon>
      <span class="result-text warning-text">已取消执行</span>
      <el-button type="primary" size="small" @click="executionStore.clearExecution()">关闭</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Loading, OfficeBuilding, Check, SuccessFilled, CircleCloseFilled, WarningFilled } from '@element-plus/icons-vue'
import { useExecutionStore } from '../stores/execution'
import type { SubTaskProgress } from '../stores/execution'
import type { CompanyInfo } from '../types/execution'

defineProps<{ taskId: number }>()

const executionStore = useExecutionStore()

const localSelectedCompany = ref<CompanyInfo | null>(null)

// 从历史中取最后一条 done 状态的子任务，用于展示完成汇总
const lastDoneSubTask = computed<SubTaskProgress | null>(() => {
  const history = executionStore.subTaskHistory
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].step === 'done') return history[i]
  }
  return null
})

// 当进入 waiting_company 步骤时重置本地选择
watch(() => executionStore.step, (newStep) => {
  if (newStep === 'waiting_company') {
    localSelectedCompany.value = null
  }
})
</script>

<style scoped>
.execution-inline {
  margin-top: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

.step-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  gap: 10px;
}

.step-message {
  font-size: 13px;
  color: #606266;
  margin: 0;
}

/* QR code */
.qr-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
}

.qr-image-box {
  width: 160px;
  height: 160px;
  border: 2px solid #dcdfe6;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #fff;
  animation: pulse 2s ease-in-out infinite;
}

.qr-image {
  width: 144px;
  height: 144px;
  object-fit: contain;
}

@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.3); }
  50% { opacity: 0.85; box-shadow: 0 0 8px 2px rgba(64, 158, 255, 0.15); }
}

.qr-hint-primary {
  margin: 10px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.qr-hint-secondary {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
}

.qr-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

/* Company list */
.company-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 8px 0;
  align-self: flex-start;
}

.company-list {
  width: 100%;
  max-height: 150px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
}

.company-card {
  border: 1.5px solid #e4e7ed;
  border-radius: 6px;
  padding: 8px 10px;
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
  gap: 8px;
}

.company-info {
  flex: 1;
  min-width: 0;
}

.company-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.company-code {
  font-size: 11px;
  color: #909399;
  font-family: monospace;
  margin-top: 2px;
}

.company-action {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

/* Executing / keeping alive */
.exec-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 0;
}

.exec-status-text {
  flex: 1;
  font-size: 13px;
  color: #409eff;
  font-weight: 500;
}

.keeping-alive-detail {
  margin: 0;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

/* Sub-task progress panel */
.subtask-panel {
  width: 100%;
  margin-top: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.subtask-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subtask-step-label {
  font-size: 12px;
  color: #606266;
}

/* Sub-task result summary */
.subtask-result {
  width: 100%;
  margin-top: 8px;
  padding: 8px 12px;
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 6px;
}

.subtask-result-header {
  margin-bottom: 6px;
}

.subtask-result-stats {
  display: flex;
  gap: 8px;
}

/* Result states */
.step-result {
  flex-direction: row;
  gap: 8px;
  padding: 10px 0;
  justify-content: center;
}

.result-text {
  font-size: 13px;
  font-weight: 500;
}

.success-text { color: #67c23a; }
.failed-text { color: #f56c6c; }
.warning-text { color: #e6a23c; }
</style>
