<template>
  <div class="task-edit-page">
    <!-- 页面标题 -->
    <h2 class="page-title">{{ isEdit ? `编辑任务 - ${form.name}` : '新增任务' }}</h2>

    <!-- 表单区域 -->
    <div class="form-wrapper">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        class="task-form"
      >
        <!-- 任务名称 -->
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入任务名称" />
        </el-form-item>

        <!-- 所属公司/租户 -->
        <el-form-item label="所属公司" prop="tenant_id">
          <el-select
            v-model="form.tenant_id"
            placeholder="请选择所属公司（选填）"
            style="width: 100%"
            filterable
            clearable
            :value-on-clear="null"
          >
            <el-option
              v-for="company in companyList"
              :key="company.id"
              :label="company.name"
              :value="company.id"
            />
          </el-select>
        </el-form-item>

        <!-- 执行设备 -->
        <el-form-item label="执行设备" prop="device_id">
          <el-select
            v-model="form.device_id"
            placeholder="请选择执行设备（选填）"
            style="width: 100%"
            filterable
            clearable
            :value-on-clear="null"
          >
            <el-option
              v-for="device in deviceList"
              :key="device.id"
              :label="device.name"
              :value="device.id"
            />
          </el-select>
        </el-form-item>

        <!-- 所属客户 -->
        <el-form-item label="所属客户" prop="customer_name">
          <el-input v-model="form.customer_name" placeholder="请输入所属客户（选填）" />
        </el-form-item>

        <!-- 经手人账号 -->
        <el-form-item label="经手人账号" prop="handler_account">
          <el-input v-model="form.handler_account" placeholder="请输入经手人账号（选填）" />
        </el-form-item>

        <!-- 省份 -->
        <el-form-item label="省份" prop="province">
          <el-select
            v-model="form.province"
            placeholder="请选择省份（选填）"
            style="width: 100%"
            filterable
            clearable
          >
            <el-option
              v-for="p in provinceList"
              :key="p"
              :label="p"
              :value="p"
            />
          </el-select>
        </el-form-item>

        <!-- 子任务 -->
        <el-form-item label="子任务" prop="sub_tasks">
          <el-checkbox-group v-model="form.sub_tasks">
            <el-checkbox label="合同备案">合同备案</el-checkbox>
            <el-checkbox label="合同录入">合同录入</el-checkbox>
            <el-checkbox label="违章查询">违章查询</el-checkbox>
            <el-checkbox label="违章同步">违章同步</el-checkbox>
            <el-checkbox label="合同调整">合同调整</el-checkbox>
            <el-checkbox label="违章转移">违章转移</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- 下次执行时间 -->
        <el-form-item label="下次执行时间">
          <el-date-picker
            v-model="form.next_executed_at"
            type="datetime"
            placeholder="请选择下次执行时间（选填）"
            style="width: 100%"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DDTHH:mm:ss"
          />
        </el-form-item>

        <!-- 备注 -->
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="4"
            placeholder="请输入备注信息（选填）"
          />
        </el-form-item>

        <!-- 底部操作按钮 -->
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useTaskStore } from '@/stores/task'
import * as deviceApi from '@/api/device'
import type { TenantInfo, DeviceInfo } from '@/api/device'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()

// 表单 ref
const formRef = ref<FormInstance>()
const saving = ref(false)

// 租户/公司列表
const companyList = ref<TenantInfo[]>([])
// 设备列表
const deviceList = ref<DeviceInfo[]>([])

// 省份列表
const provinceList = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
  '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
  '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆',
]

/** 表单数据 */
const form = ref({
  name: '',
  tenant_id: null as string | null,
  device_id: null as string | null,
  customer_name: '',
  handler_account: '',
  sub_tasks: [] as string[],
  province: null as string | null,
  next_executed_at: null as string | null,
  remark: '',
})

/** 表单校验规则 */
const rules: FormRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
}

/** 判断是否为编辑模式 */
const isEdit = computed(() => !!route.params.id)
const editId = computed(() => Number(route.params.id))

/** 加载租户和设备列表 */
async function loadCompanyList() {
  try {
    companyList.value = await deviceApi.getTenantList()
  } catch {
    console.error('加载租户列表失败')
  }
}

async function loadDeviceList() {
  try {
    deviceList.value = await deviceApi.getDeviceList()
  } catch {
    console.error('加载设备列表失败')
  }
}

/** 初始化 */
onMounted(async () => {
  // 并行加载租户和设备列表
  await Promise.all([loadCompanyList(), loadDeviceList()])

  if (isEdit.value) {
    const task = await taskStore.getTaskById(editId.value)
    if (task) {
      form.value = {
        name: task.name,
        tenant_id: task.tenantId ?? null,
        device_id: task.deviceId ?? null,
        customer_name: task.customerName ?? '',
        handler_account: task.handlerAccount ?? '',
        sub_tasks: task.subTasks ? [...task.subTasks] : [],
        province: task.province ?? null,
        next_executed_at: task.nextExecutedAt ?? null,
        remark: task.remark || '',
      }
    } else {
      ElMessage.error('任务不存在')
      router.push('/tasks')
    }
  }
})

/** 保存 */
const handleSave = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const payload: any = {
      name: form.value.name,
      tenant_id: form.value.tenant_id,
      device_id: form.value.device_id,
      customer_name: form.value.customer_name,
      handler_account: form.value.handler_account || null,
      sub_tasks: form.value.sub_tasks.length > 0 ? form.value.sub_tasks : null,
      province: form.value.province,
      next_executed_at: form.value.next_executed_at || null,
      remark: form.value.remark,
    }
    if (isEdit.value) {
      await taskStore.updateTaskById(editId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await taskStore.addTask(payload)
      ElMessage.success('新增成功')
    }
    router.push('/tasks')
  } catch {
    ElMessage.error(isEdit.value ? '更新失败' : '新增失败')
  } finally {
    saving.value = false
  }
}

/** 取消 */
const handleCancel = () => {
  router.push('/tasks')
}
</script>

<style scoped>
.task-edit-page {
  padding: 20px;
}

.page-title {
  margin: 0 0 24px;
  font-size: 18px;
}

.form-wrapper {
  display: flex;
  justify-content: center;
}

.task-form {
  width: 600px;
}


</style>
