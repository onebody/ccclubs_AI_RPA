import { BrowserService } from '../services/BrowserService';
import { PageHandler } from '../services/PageHandler';
import { ZJ122_LOCATORS, getSelector } from '../services/ElementLocator';
import { Logger } from '../logger/Logger';
import { ConfigManager } from '../config/ConfigManager';

const logger = Logger.getInstance();
const configManager = ConfigManager.getInstance();

export interface LoginResult {
  success: boolean;
  message: string;
}

export interface VehicleInfo {
  plateNumber: string;
  vehicleType: string;
  owner: string;
  status: string;
}

export interface ViolationInfo {
  id: string;
  plateNumber: string;
  location: string;
  time: string;
  violation: string;
  penalty: string;
  status: string;
}

export class Zj122Automation {
  private browserService: BrowserService;
  private pageHandler: PageHandler | null = null;

  constructor() {
    this.browserService = BrowserService.getInstance();
  }

  public async init(): Promise<void> {
    await this.browserService.launch();
    const page = this.browserService.getPage();
    if (page) {
      this.pageHandler = new PageHandler(page);
    }
  }

  public async destroy(): Promise<void> {
    await this.browserService.close();
  }

  public async navigateToLogin(): Promise<void> {
    if (!this.pageHandler) throw new Error('Automation not initialized');
    const targetUrl = configManager.getTargetConfig().url;
    await this.browserService.navigate(targetUrl);
    await this.browserService.takeScreenshot('login_page');
    logger.info('Navigated to login page');
  }

  public async login(username?: string, password?: string): Promise<LoginResult> {
    if (!this.pageHandler) throw new Error('Automation not initialized');
    try {
      const targetConfig = configManager.getTargetConfig();
      const user = username || targetConfig.username;
      const pass = password || targetConfig.password;
      if (!user || !pass) {
        return { success: false, message: 'Username or password not configured' };
      }
      await this.pageHandler.click(getSelector(ZJ122_LOCATORS.PERSONAL_LOGIN_BUTTON));
      await this.browserService.waitForLoad();
      logger.info('Clicked personal login button');
      await this.pageHandler.fill(getSelector(ZJ122_LOCATORS.USERNAME_INPUT), user);
      await this.pageHandler.fill(getSelector(ZJ122_LOCATORS.PASSWORD_INPUT), pass);
      const verifyCodeInput = getSelector(ZJ122_LOCATORS.VERIFY_CODE_INPUT);
      const isVerifyCodeVisible = await this.pageHandler.isVisible(verifyCodeInput, { timeout: 5000 });
      if (isVerifyCodeVisible) {
        logger.warn('Verification code required');
        await this.browserService.takeScreenshot('verify_code_required');
        return { success: false, message: 'Verification code required' };
      }
      await this.pageHandler.click(getSelector(ZJ122_LOCATORS.LOGIN_SUBMIT_BUTTON));
      await this.browserService.waitForLoad();
      await this.browserService.takeScreenshot('after_login');
      logger.info('Login attempt completed');
      return { success: true, message: 'Login attempt completed' };
    } catch (error) {
      logger.error('Login error', error);
      return { success: false, message: 'Login error: ' + (error as Error).message };
    }
  }

  public async navigateToBusinessHandle(): Promise<void> {
    if (!this.pageHandler) throw new Error('Automation not initialized');
    try {
      await this.pageHandler.click(getSelector(ZJ122_LOCATORS.BUSINESS_HANDLE_LINK));
      await this.browserService.waitForLoad();
      await this.browserService.takeScreenshot('business_handle');
      logger.info('Navigated to business handle page');
    } catch (error) {
      logger.error('Navigate to business handle failed', error);
      throw error;
    }
  }

  public async navigateToVehicleManagement(): Promise<void> {
    if (!this.pageHandler) throw new Error('Automation not initialized');
    try {
      await this.pageHandler.click(getSelector(ZJ122_LOCATORS.VEHICLE_MANAGE_LINK));
      await this.browserService.waitForLoad();
      await this.browserService.takeScreenshot('vehicle_management');
      logger.info('Navigated to vehicle management page');
    } catch (error) {
      logger.error('Navigate to vehicle management failed', error);
      throw error;
    }
  }

  public async navigateToViolationQuery(): Promise<void> {
    if (!this.pageHandler) throw new Error('Automation not initialized');
    try {
      await this.pageHandler.click(getSelector(ZJ122_LOCATORS.VIOLATION_QUERY_LINK));
      await this.browserService.waitForLoad();
      await this.browserService.takeScreenshot('violation_query');
      logger.info('Navigated to violation query page');
    } catch (error) {
      logger.error('Navigate to violation query failed', error);
      throw error;
    }
  }

  public async getMyVehicles(): Promise<VehicleInfo[]> {
    if (!this.pageHandler) throw new Error('Automation not initialized');
    try {
      await this.navigateToBusinessHandle();
      await this.pageHandler.click(getSelector(ZJ122_LOCATORS.MY_VEHICLE_LINK));
      await this.browserService.waitForLoad();
      await this.browserService.takeScreenshot('my_vehicles');
      const vehicles: VehicleInfo[] = [];
      const rowCount = await this.pageHandler.executeScript<number>(
        'const rows = document.querySelectorAll("table tbody tr"); return rows.length;'
      );
      for (let i = 0; i < rowCount; i++) {
        const vehicle: VehicleInfo = await this.pageHandler.executeScript<VehicleInfo>(
          'const rows = document.querySelectorAll("table tbody tr"); const row = rows[' + i + ']; const cells = row.querySelectorAll("td"); return { plateNumber: cells[0]?.textContent?.trim() || "", vehicleType: cells[1]?.textContent?.trim() || "", owner: cells[2]?.textContent?.trim() || "", status: cells[3]?.textContent?.trim() || "" };',
        );
        if (vehicle.plateNumber) {
          vehicles.push(vehicle);
        }
      }
      logger.info('Got vehicle list, total: ' + vehicles.length);
      return vehicles;
    } catch (error) {
      logger.error('Get vehicle list failed', error);
      throw error;
    }
  }

  public async getViolationList(): Promise<ViolationInfo[]> {
    if (!this.pageHandler) throw new Error('Automation not initialized');
    try {
      await this.navigateToBusinessHandle();
      await this.navigateToViolationQuery();
      const violations: ViolationInfo[] = [];
      const rowCount = await this.pageHandler.executeScript<number>(
        'const rows = document.querySelectorAll("table tbody tr"); return rows.length;'
      );
      for (let i = 0; i < rowCount; i++) {
        const violation: ViolationInfo = await this.pageHandler.executeScript<ViolationInfo>(
          'const rows = document.querySelectorAll("table tbody tr"); const row = rows[' + i + ']; const cells = row.querySelectorAll("td"); return { id: cells[0]?.textContent?.trim() || "", plateNumber: cells[1]?.textContent?.trim() || "", location: cells[2]?.textContent?.trim() || "", time: cells[3]?.textContent?.trim() || "", violation: cells[4]?.textContent?.trim() || "", penalty: cells[5]?.textContent?.trim() || "", status: cells[6]?.textContent?.trim() || "" };',
        );
        if (violation.id || violation.plateNumber) {
          violations.push(violation);
        }
      }
      logger.info('Got violation list, total: ' + violations.length);
      return violations;
    } catch (error) {
      logger.error('Get violation list failed', error);
      throw error;
    }
  }

  public async searchViolation(plateNumber: string): Promise<ViolationInfo[]> {
    if (!this.pageHandler) throw new Error('Automation not initialized');
    try {
      await this.navigateToBusinessHandle();
      await this.navigateToViolationQuery();
      const plateInputSelector = getSelector(ZJ122_LOCATORS.PLATE_NUMBER_INPUT);
      const isPlateInputVisible = await this.pageHandler.isVisible(plateInputSelector, { timeout: 5000 });
      if (isPlateInputVisible) {
        await this.pageHandler.fill(plateInputSelector, plateNumber);
        await this.pageHandler.click(getSelector(ZJ122_LOCATORS.SEARCH_BUTTON));
        await this.browserService.waitForLoad();
        await this.browserService.takeScreenshot('violation_search_result');
      } else {
        logger.warn('Plate number input not found');
      }
      return await this.getViolationList();
    } catch (error) {
      logger.error('Search violation failed', error);
      throw error;
    }
  }
}
