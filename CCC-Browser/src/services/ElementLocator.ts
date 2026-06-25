export interface LocatorStrategy {
  name: string;
  selector: string;
  type: 'css' | 'xpath' | 'text' | 'data-testid';
}

export const ZJ122_LOCATORS: Record<string, LocatorStrategy> = {
  LOGIN_PAGE_TITLE: {
    name: 'Login page title',
    selector: '//title[contains(text(),"交通安全综合服务平台")]',
    type: 'xpath',
  },
  PERSONAL_LOGIN_BUTTON: {
    name: 'Personal login button',
    selector: 'button:has-text("个人用户登录")',
    type: 'css',
  },
  USERNAME_INPUT: {
    name: 'Username input',
    selector: 'input[name="username"]',
    type: 'css',
  },
  PASSWORD_INPUT: {
    name: 'Password input',
    selector: 'input[name="password"]',
    type: 'css',
  },
  VERIFY_CODE_INPUT: {
    name: 'Verify code input',
    selector: 'input[name="verifyCode"]',
    type: 'css',
  },
  VERIFY_CODE_IMAGE: {
    name: 'Verify code image',
    selector: 'img[alt="验证码"]',
    type: 'css',
  },
  LOGIN_SUBMIT_BUTTON: {
    name: 'Login submit button',
    selector: 'button[type="submit"]',
    type: 'css',
  },
  HOME_PAGE_TITLE: {
    name: 'Home page title',
    selector: '//title[contains(text(),"交通安全综合服务平台")]',
    type: 'xpath',
  },
  BUSINESS_HANDLE_LINK: {
    name: 'Business handle link',
    selector: 'a:has-text("业务办理")',
    type: 'css',
  },
  SERVICE_NAV_LINK: {
    name: 'Service navigation link',
    selector: 'a:has-text("服务导航")',
    type: 'css',
  },
  VIOLATION_QUERY_LINK: {
    name: 'Violation query link',
    selector: 'a:has-text("违法")',
    type: 'css',
  },
  VEHICLE_MANAGE_LINK: {
    name: 'Vehicle management link',
    selector: 'a:has-text("机动车")',
    type: 'css',
  },
  MY_VEHICLE_LINK: {
    name: 'My vehicle link',
    selector: '//a[contains(text(),"我的车辆")]',
    type: 'xpath',
  },
  MY_DRIVER_LINK: {
    name: 'My driver link',
    selector: '//a[contains(text(),"我的驾驶证")]',
    type: 'xpath',
  },
  VIOLATION_LIST_TABLE: {
    name: 'Violation list table',
    selector: 'table[class*="violation"]',
    type: 'css',
  },
  VEHICLE_LIST_TABLE: {
    name: 'Vehicle list table',
    selector: 'table[class*="vehicle"]',
    type: 'css',
  },
  NEXT_PAGE_BUTTON: {
    name: 'Next page button',
    selector: '//button[text()="下一页"]',
    type: 'xpath',
  },
  SEARCH_BUTTON: {
    name: 'Search button',
    selector: '//button[text()="搜索"]',
    type: 'xpath',
  },
  SUBMIT_BUTTON: {
    name: 'Submit button',
    selector: '//button[text()="提交"]',
    type: 'xpath',
  },
  CONFIRM_BUTTON: {
    name: 'Confirm button',
    selector: '//button[text()="确认"]',
    type: 'xpath',
  },
  CANCEL_BUTTON: {
    name: 'Cancel button',
    selector: '//button[text()="取消"]',
    type: 'xpath',
  },
  PLATE_NUMBER_INPUT: {
    name: 'Plate number input',
    selector: 'input[placeholder*="号牌"]',
    type: 'css',
  },
};

export function getSelector(strategy: LocatorStrategy): string {
  return strategy.selector;
}

export function getLocatorName(strategy: LocatorStrategy): string {
  return strategy.name;
}