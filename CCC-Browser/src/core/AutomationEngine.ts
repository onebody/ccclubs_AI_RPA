import { Zj122Automation, LoginResult, VehicleInfo, ViolationInfo } from '../automation/Zj122Automation';
import { Logger } from '../logger/Logger';

const logger = Logger.getInstance();

export interface AutomationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export class AutomationEngine {
  private automation: Zj122Automation;

  constructor() {
    this.automation = new Zj122Automation();
  }

  public async start(): Promise<AutomationResult<void>> {
    try {
      logger.info('Starting automation engine...');
      await this.automation.init();
      return { success: true, timestamp: new Date() };
    } catch (error) {
      logger.error('Start automation engine failed', error);
      return { success: false, error: (error as Error).message, timestamp: new Date() };
    }
  }

  public async stop(): Promise<AutomationResult<void>> {
    try {
      logger.info('Stopping automation engine...');
      await this.automation.destroy();
      return { success: true, timestamp: new Date() };
    } catch (error) {
      logger.error('Stop automation engine failed', error);
      return { success: false, error: (error as Error).message, timestamp: new Date() };
    }
  }

  public async executeFullFlow(username?: string, password?: string): Promise<AutomationResult<{
    login: LoginResult;
    vehicles: VehicleInfo[];
    violations: ViolationInfo[];
  }>> {
    try {
      const result: {
        login: LoginResult;
        vehicles: VehicleInfo[];
        violations: ViolationInfo[];
      } = {
        login: {} as LoginResult,
        vehicles: [] as VehicleInfo[],
        violations: [] as ViolationInfo[],
      };

      logger.info('Executing full automation flow...');

      await this.automation.navigateToLogin();

      result.login = await this.automation.login(username, password);

      if (!result.login.success) {
        return { success: false, error: result.login.message, timestamp: new Date() };
      }

      result.vehicles = await this.automation.getMyVehicles();
      result.violations = await this.automation.getViolationList();

      logger.info('Full automation flow completed');
      return { success: true, data: result, timestamp: new Date() };
    } catch (error) {
      logger.error('Execute full flow failed', error);
      return { success: false, error: (error as Error).message, timestamp: new Date() };
    }
  }

  public async login(username?: string, password?: string): Promise<AutomationResult<LoginResult>> {
    try {
      await this.automation.navigateToLogin();
      const result = await this.automation.login(username, password);
      return { success: result.success, data: result, timestamp: new Date() };
    } catch (error) {
      logger.error('Login failed', error);
      return { success: false, error: (error as Error).message, timestamp: new Date() };
    }
  }

  public async getVehicles(): Promise<AutomationResult<VehicleInfo[]>> {
    try {
      const vehicles = await this.automation.getMyVehicles();
      return { success: true, data: vehicles, timestamp: new Date() };
    } catch (error) {
      logger.error('Get vehicles failed', error);
      return { success: false, error: (error as Error).message, timestamp: new Date() };
    }
  }

  public async getViolations(): Promise<AutomationResult<ViolationInfo[]>> {
    try {
      const violations = await this.automation.getViolationList();
      return { success: true, data: violations, timestamp: new Date() };
    } catch (error) {
      logger.error('Get violations failed', error);
      return { success: false, error: (error as Error).message, timestamp: new Date() };
    }
  }

  public async searchViolation(plateNumber: string): Promise<AutomationResult<ViolationInfo[]>> {
    try {
      const violations = await this.automation.searchViolation(plateNumber);
      return { success: true, data: violations, timestamp: new Date() };
    } catch (error) {
      logger.error('Search violation failed', error);
      return { success: false, error: (error as Error).message, timestamp: new Date() };
    }
  }
}
