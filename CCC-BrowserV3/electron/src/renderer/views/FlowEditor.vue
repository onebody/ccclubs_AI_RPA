<template>
  <div class="flow-editor">
    <div class="toolbar">
      <h2>流程编排画布</h2>
      <div class="toolbar-actions">
        <el-button size="small" @click="addNode('navigate')">导航</el-button>
        <el-button size="small" @click="addNode('click')">点击</el-button>
        <el-button size="small" @click="addNode('fill')">填写</el-button>
        <el-button size="small" @click="addNode('wait')">等待</el-button>
        <el-button size="small" @click="addNode('extract')">提取</el-button>
        <el-button size="small" @click="addNode('screenshot')">截图</el-button>
        <el-button size="small" @click="addNode('condition')">条件</el-button>
        <el-button size="small" @click="addNode('delay')">延迟</el-button>
        <el-divider direction="vertical" />
        <el-button size="small" type="primary" @click="validateFlow">验证</el-button>
        <el-button size="small" type="success" @click="executeFlow">执行</el-button>
        <el-button size="small" @click="exportFlow">导出JSON</el-button>
      </div>
    </div>

    <div class="canvas-wrapper">
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        :default-viewport="{ zoom: 1, x: 0, y: 0 }"
        :min-zoom="0.2"
        :max-zoom="4"
        fit-view-on-init
        class="vue-flow-canvas"
      >
        <Background />
        <Controls />
        <MiniMap />
      </VueFlow>
    </div>

    <!-- 节点配置面板 -->
    <el-drawer v-model="showConfig" title="节点配置" size="400px">
      <el-form v-if="selectedNode" :model="selectedNode.data" label-width="100px">
        <el-form-item label="节点名称">
          <el-input v-model="selectedNode.data.label" />
        </el-form-item>
        <el-form-item v-if="selectedNode.data.type === 'navigate'" label="目标URL">
          <el-input v-model="selectedNode.data.config.url" placeholder="https://..." />
        </el-form-item>
        <el-form-item v-if="['click', 'fill', 'extract', 'wait'].includes(selectedNode.data.type)" label="CSS选择器">
          <el-input v-model="selectedNode.data.config.selector" placeholder=".selector" />
        </el-form-item>
        <el-form-item v-if="selectedNode.data.type === 'fill'" label="填写值">
          <el-input v-model="selectedNode.data.config.value" placeholder="输入值" />
        </el-form-item>
        <el-form-item v-if="selectedNode.data.type === 'delay'" label="最小延迟(ms)">
          <el-input-number v-model="selectedNode.data.config.min_ms" :min="100" :max="10000" />
        </el-form-item>
        <el-form-item v-if="selectedNode.data.type === 'delay'" label="最大延迟(ms)">
          <el-input-number v-model="selectedNode.data.config.max_ms" :min="100" :max="30000" />
        </el-form-item>
        <el-form-item v-if="selectedNode.data.type === 'condition'" label="条件表达式">
          <el-input v-model="selectedNode.data.config.expression" type="textarea" :rows="3" placeholder="JS表达式" />
        </el-form-item>
      </el-form>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw } from 'vue';
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import { ElMessage } from 'element-plus';
import { scheduleApi } from '@/api/tauri-api';

/** 节点类型配置 */
const NODE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  navigate: { label: '导航', color: '#409eff' },
  click: { label: '点击', color: '#67c23a' },
  fill: { label: '填写', color: '#e6a23c' },
  wait: { label: '等待', color: '#909399' },
  extract: { label: '提取', color: '#f56c6c' },
  screenshot: { label: '截图', color: '#a855f7' },
  condition: { label: '条件', color: '#f97316' },
  delay: { label: '延迟', color: '#6b7280' },
};

interface FlowNodeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    type: string;
    label: string;
    config: Record<string, any>;
  };
}

const nodes = ref<FlowNodeData[]>([]);
const edges = ref<any[]>([]);
const showConfig = ref(false);
const selectedNode = ref<FlowNodeData | null>(null);
let nodeCounter = 0;

/** 添加新节点 */
function addNode(type: string): void {
  nodeCounter++;
  const config = NODE_TYPE_CONFIG[type] || { label: type, color: '#999' };
  const id = `node_${nodeCounter}`;
  const newNode: FlowNodeData = {
    id,
    type: 'default',
    position: { x: 200 + nodeCounter * 50, y: 100 + nodeCounter * 30 },
    data: {
      type,
      label: `${config.label} ${nodeCounter}`,
      config: getDefaultConfig(type),
    },
  };
  nodes.value.push(newNode);
}

/** 获取节点类型的默认配置 */
function getDefaultConfig(type: string): Record<string, any> {
  const defaults: Record<string, any> = {
    navigate: { url: '', wait_until: 'domcontentloaded' },
    click: { selector: '', timeout: 10000 },
    fill: { selector: '', value: '' },
    wait: { selector: '', timeout: 30000 },
    extract: { selector: 'body', attribute: null },
    screenshot: { full_page: false },
    condition: { expression: '' },
    delay: { min_ms: 500, max_ms: 2000 },
  };
  return defaults[type] || {};
}

/** 验证流程 */
async function validateFlow(): Promise<void> {
  const flowDef = buildFlowDefinition();
  try {
    const result = await scheduleApi.validateFlow(flowDef) as any;
    if (result?.status === 'valid') {
      ElMessage.success(`流程验证通过，共 ${result.node_count} 个节点`);
    } else {
      ElMessage.error(`流程验证失败: ${result?.message}`);
    }
  } catch (e: any) {
    ElMessage.error(`验证请求失败: ${e.message}`);
  }
}

/** 执行流程 */
async function executeFlow(): Promise<void> {
  ElMessage.info('请先选择一个浏览器会话');
}

/** 导出流程 JSON */
function exportFlow(): void {
  const flowDef = buildFlowDefinition();
  const json = JSON.stringify(flowDef, null, 2);
  console.log('流程定义 JSON:', json);
  ElMessage.success('流程JSON已输出到控制台');
}

/** 构建流程定义对象 */
function buildFlowDefinition(): any {
  const flowNodes = nodes.value.map((n) => ({
    id: n.id,
    type: n.data.type,
    name: n.data.label,
    config: n.data.config,
    next_nodes: edges.value
      .filter((e: any) => e.source === n.id)
      .map((e: any) => e.target),
  }));

  return {
    id: 'flow_1',
    name: '自定义流程',
    entry_node_id: nodes.value[0]?.id || '',
    nodes: flowNodes,
  };
}
</script>

<style scoped>
.flow-editor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid #e4e7ed;
  background: #fafafa;
}
.toolbar h2 {
  margin: 0;
  font-size: 16px;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.canvas-wrapper {
  flex: 1;
  position: relative;
}
.vue-flow-canvas {
  width: 100%;
  height: 100%;
}
</style>
