<template>
  <div class="stats-page">
    <div class="page-header">
      <h2>统计分析</h2>
    </div>

    <div class="charts-grid">
      <el-card class="chart-card">
        <template #header>
          <span>租户会话分布</span>
        </template>
        <div ref="tenantChartRef" class="chart"></div>
      </el-card>

      <el-card class="chart-card">
        <template #header>
          <span>任务类型分布</span>
        </template>
        <div ref="taskTypeChartRef" class="chart"></div>
      </el-card>

      <el-card class="chart-card">
        <template #header>
          <span>每日任务量</span>
        </template>
        <div ref="dailyTaskChartRef" class="chart"></div>
      </el-card>

      <el-card class="chart-card">
        <template #header>
          <span>会话生命周期分布</span>
        </template>
        <div ref="lifetimeChartRef" class="chart"></div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'

const tenantChartRef = ref()
const taskTypeChartRef = ref()
const dailyTaskChartRef = ref()
const lifetimeChartRef = ref()

function initCharts() {
  if (tenantChartRef.value) {
    const chart = echarts.init(tenantChartRef.value)
    chart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: 45, name: '租户A' },
          { value: 30, name: '租户B' },
          { value: 15, name: '租户C' },
          { value: 10, name: '其他' },
        ],
      }],
    })
  }

  if (taskTypeChartRef.value) {
    const chart = echarts.init(taskTypeChartRef.value)
    chart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: ['数据抽取', 'AI解析', '点击操作', '导航'] },
      series: [{
        type: 'bar',
        data: [350, 280, 220, 150],
        itemStyle: { borderRadius: [0, 4, 4, 0] },
      }],
    })
  }

  if (dailyTaskChartRef.value) {
    const chart = echarts.init(dailyTaskChartRef.value)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
      yAxis: { type: 'value' },
      series: [{
        type: 'line',
        data: [120, 150, 180, 140, 200, 90, 80],
        smooth: true,
        areaStyle: {},
      }],
    })
  }

  if (lifetimeChartRef.value) {
    const chart = echarts.init(lifetimeChartRef.value)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: ['<30min', '30-60min', '1-2h', '2-4h', '>4h'] },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: [25, 35, 20, 15, 5],
      }],
    })
  }
}

onMounted(initCharts)
</script>

<style scoped>
.stats-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.chart-card {
  height: 300px;
}

.chart {
  height: calc(100% - 48px);
}
</style>