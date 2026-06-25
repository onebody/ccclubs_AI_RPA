export type DelayMode = 'fast' | 'balance' | 'high_sim';

export interface LoginBlock {
  loginUrl: string;
  usernameLocator: string;
  passwordLocator: string;
  submitBtn: string;
  loginSuccessVerify: string;
}

export interface FormField {
  locator: string;
  dataKey: string;
  fieldType?: 'input' | 'select' | 'textarea' | 'checkbox' | 'radio';
  selectValue?: string;
}

export interface SceneConfig {
  sceneId: string;
  sceneName: string;
  jumpUrl: string;
  jumpVerify: string;
  formFields: FormField[];
  submitBtn: string;
  successTip: string;
}

export interface ProcessTemplate {
  processName: string;
  delayMode: DelayMode;
  sessionCacheEnable: boolean;
  sessionCacheTtl: number;
  loginBlock: LoginBlock;
  sceneList: SceneConfig[];
}

export interface ExecutionContext {
  sessionId: string;
  tenantId: string;
  processId: string;
  template: ProcessTemplate;
  userData: Record<string, any>;
  currentSceneIndex: number;
  retryCount: number;
  maxRetries: number;
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  sceneResults?: SceneResult[];
  error?: Error;
}

export interface SceneResult {
  sceneId: string;
  sceneName: string;
  success: boolean;
  message: string;
  dataCount: number;
  startTime: number;
  endTime: number;
}