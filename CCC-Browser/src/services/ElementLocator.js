"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZJ122_LOCATORS = void 0;
exports.getSelector = getSelector;
exports.getLocatorName = getLocatorName;
exports.ZJ122_LOCATORS = {
    LOGIN_PAGE_TITLE: {
        name: 'Login page title',
        selector: '//title[contains(text(),"交通安全综合服务管理平台")]',
        type: 'xpath',
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
    LOGIN_BUTTON: {
        name: 'Login button',
        selector: 'button[type="submit"]',
        type: 'css',
    },
    HOME_PAGE_TITLE: {
        name: 'Home page title',
        selector: '//title[contains(text(),"交通安全综合服务平台")]',
        type: 'xpath',
    },
    VEHICLE_MANAGEMENT_MENU: {
        name: 'Vehicle management menu',
        selector: '//span[text()="机动车业务"]',
        type: 'xpath',
    },
    DRIVER_MANAGEMENT_MENU: {
        name: 'Driver management menu',
        selector: '//span[text()="驾驶证业务"]',
        type: 'xpath',
    },
    VIOLATION_QUERY_MENU: {
        name: 'Violation query menu',
        selector: '//span[text()="违法处理业务"]',
        type: 'xpath',
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
};
function getSelector(strategy) {
    return strategy.selector;
}
function getLocatorName(strategy) {
    return strategy.name;
}
