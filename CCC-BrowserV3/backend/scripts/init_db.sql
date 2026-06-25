-- ============================
-- RPA 自动化浏览器 - 数据库初始化脚本
-- PostgreSQL 15.8+
-- ============================

-- 创建数据库（如果不存在）
-- CREATE DATABASE rpa_browser_v3;

-- ============================
-- 4.1.1 任务配置表 (tasks)
-- 存储"怎么做"（配置），包括登录流程和业务流程
-- ============================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    flow_type VARCHAR(50) NOT NULL CHECK (flow_type IN ('login', 'business')),
    flow_config JSONB DEFAULT '{}',
    target_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE tasks IS '任务配置表：存储任务定义和流程配置';
COMMENT ON COLUMN tasks.flow_config IS '流程配置 JSON：包含选择器、等待条件、提取规则等';

-- ============================
-- 4.1.2 浏览器会话表 (browser_sessions)
-- 记录每个浏览器上下文的物理隔离信息
-- ============================
CREATE TABLE IF NOT EXISTS browser_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    user_data_dir TEXT,
    storage_state_path TEXT,
    proxy_config JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE browser_sessions IS '浏览器会话表：记录 BrowserContext 的物理隔离信息';
COMMENT ON COLUMN tasks.storage_state_path IS '登录态持久化文件路径（Cookie + LocalStorage）';

-- ============================
-- 4.1.3 任务执行实例表 (task_instances)
-- 记录"做得怎么样"（执行），每次执行生成一条记录
-- ============================
CREATE TABLE IF NOT EXISTS task_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    session_id UUID REFERENCES browser_sessions(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'success', 'failed', 'intercepted')),
    error_code INT,
    error_msg TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE task_instances IS '任务执行实例表：记录每次任务执行的运行状态和结果';

-- ============================
-- 4.1.4 业务数据表 (vehicle_violations)
-- 存储抓取到的结构化业务数据（以车辆违章查询为例）
-- ============================
CREATE TABLE IF NOT EXISTS vehicle_violations (
    id BIGSERIAL PRIMARY KEY,
    instance_id UUID REFERENCES task_instances(id) ON DELETE CASCADE,
    plate_number VARCHAR(20),
    violation_data JSONB,
    raw_json_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE vehicle_violations IS '业务数据表：存储抓取到的结构化数据';
COMMENT ON COLUMN vehicle_violations.violation_data IS '违章数据 JSON：包含违章时间、地点、罚款等';
COMMENT ON COLUMN vehicle_violations.raw_json_path IS '原始 JSON 文件路径（本地文件系统）';

-- ============================
-- 索引优化
-- ============================
CREATE INDEX IF NOT EXISTS idx_task_instances_task_id ON task_instances(task_id);
CREATE INDEX IF NOT EXISTS idx_task_instances_status ON task_instances(status);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_task_id ON browser_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_status ON browser_sessions(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_violations_instance_id ON vehicle_violations(instance_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_violations_plate ON vehicle_violations(plate_number);
CREATE INDEX IF NOT EXISTS idx_tasks_flow_type ON tasks(flow_type);

-- ============================
-- 错误码对照表（仅作文档参考，不建表）
-- ============================
-- 200  | 成功       | 任务执行/接口调用成功           | 正常流转
-- 4001 | 鉴权失败   | Token无效或时间戳过期           | 前端触发重新握手获取Token
-- 4003 | 权限拒绝   | 请求的会话ID不存在或已销毁       | 刷新会话列表
-- 4010 | 参数缺失   | 缺少必要的URL或配置参数         | 检查前端表单校验逻辑
-- 5001 | 浏览器启动失败 | Chromium进程被拦截或缺少依赖  | 检查系统环境或杀毒软件白名单
-- 5002 | 登录态失效 | 二维码过期或Cookie被踢下线       | 触发重新登录流程
-- 5003 | 元素未找到 | 目标DOM节点超时未加载            | 截图并上报前端，提示用户检查
-- 5004 | 反爬风控拦截 | 触发滑块验证或403 Forbidden    | 暂停任务，转人工介入或切换IP
