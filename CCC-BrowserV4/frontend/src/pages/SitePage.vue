<template>
  <div class="site-page">
    <div class="page-header">
      <h2 class="page-title">站点管理</h2>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索站点名称或类型"
          clearable
          style="width: 240px"
        />
        <el-button type="primary" @click="handleAdd">新增站点</el-button>
      </div>
    </div>

    <el-table :data="filteredSiteList" style="margin-top: 16px" border>
      <el-table-column prop="name" label="站点名称" min-width="180" />
      <el-table-column label="外标网址" min-width="240">
        <template #default="{ row }">
          <el-link type="primary" :href="row.url" target="_blank">{{ row.url }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="站点类型" width="120">
        <template #default="{ row }">
          <el-tag :type="typeTagColor(row.type)">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="160">
        <template #default="{ row }">
          {{ row.remark || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-switch v-model="row.enabled" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { SiteInfo } from '@/types'

const searchKeyword = ref('')

const siteList = ref<SiteInfo[]>([
  { id: 1, name: '国家企业信用信息公示系统', url: 'https://www.gsxt.gov.cn', type: '企业查询', remark: '企业工商信息查询', enabled: true, createdAt: '2025-01-15' },
  { id: 2, name: '中国裁判文书网', url: 'https://wenshu.court.gov.cn', type: '司法查询', remark: '裁判文书公开查询', enabled: true, createdAt: '2025-02-20' },
  { id: 3, name: '信用中国', url: 'https://www.creditchina.gov.cn', type: '政务网站', remark: '信用信息查询', enabled: false, createdAt: '2025-03-10' },
])

const filteredSiteList = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return siteList.value
  return siteList.value.filter(
    (site) =>
      site.name.toLowerCase().includes(keyword) ||
      site.type.toLowerCase().includes(keyword)
  )
})

const typeTagColor = (type: SiteInfo['type']): '' | 'success' | 'warning' | 'danger' | 'info' => {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    '政务网站': '',
    '企业查询': 'success',
    '司法查询': 'warning',
    '信用服务': 'info',
    '其他': 'danger',
  }
  return map[type] || 'info'
}

const handleAdd = () => {
  ElMessage.info('新增站点功能开发中')
}

const handleEdit = (_row: SiteInfo) => {
  ElMessage.info('编辑功能开发中')
}

const handleDelete = (row: SiteInfo) => {
  ElMessageBox.confirm(`确认删除站点「${row.name}」吗？`, '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    siteList.value = siteList.value.filter((item) => item.id !== row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}
</script>

<style scoped>
.site-page {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  margin: 0;
  font-size: 18px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
