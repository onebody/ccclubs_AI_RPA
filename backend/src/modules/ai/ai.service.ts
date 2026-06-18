import { Injectable } from '@nestjs/common';

export interface ParsePageTaskRequest {
  dom: string;
  screenshot: string;
  userCommand: string;
}

export interface PlaywrightStep {
  action: string;
  selector: string;
  value?: string;
}

export interface ParsePageTaskResponse {
  steps: PlaywrightStep[];
}

export interface OCRRequest {
  imageBuffer: string;
}

export interface OCRResponse {
  text: string;
}

export interface ExtractStructDataRequest {
  dom: string;
  ruleJson: string;
}

export interface ExtractStructDataResponse {
  data: Record<string, any>;
}

@Injectable()
export class AiService {
  private ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';

  async parsePageTask(request: ParsePageTaskRequest): Promise<ParsePageTaskResponse> {
    const prompt = `
      你是一个网页操作专家。请根据用户指令和页面信息，生成 Playwright 操作步骤。
      
      用户指令：${request.userCommand}
      
      请输出标准格式的操作步骤，每个步骤包含：
      - action: 操作类型（click, fill, waitForSelector, goBack, screenshot 等）
      - selector: 元素选择器
      - value: 输入值（如果需要）
      
      返回 JSON 格式：{"steps": [...]}
    `;

    try {
      const response = await fetch(`${this.ollamaHost}/api/generate`, {
        method: 'POST',
        body: JSON.stringify({
          model: 'llama3',
          prompt,
          stream: false,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      const jsonMatch = data.response?.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {}

    return {
      steps: [
        { action: 'waitForSelector', selector: 'body' },
        { action: 'screenshot', selector: '' },
      ],
    };
  }

  async ocrImage(request: OCRRequest): Promise<OCRResponse> {
    return {
      text: 'OCR识别结果模拟',
    };
  }

  async extractStructData(request: ExtractStructDataRequest): Promise<ExtractStructDataResponse> {
    const rules = JSON.parse(request.ruleJson);

    return {
      data: {
        extracted: '模拟抽取数据',
        rulesApplied: rules,
      },
    };
  }

  async executeCommand(sessionId: string, command: string) {
    return {
      sessionId,
      command,
      status: 'executing',
      steps: [
        { action: 'navigate', selector: '', value: 'about:blank' },
        { action: 'waitForLoad', selector: 'body' },
      ],
    };
  }
}