"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Zj122Automation = void 0;
var BrowserService_1 = require("../services/BrowserService");
var PageHandler_1 = require("../services/PageHandler");
var ElementLocator_1 = require("../services/ElementLocator");
var Logger_1 = require("../logger/Logger");
var ConfigManager_1 = require("../config/ConfigManager");
var logger = Logger_1.Logger.getInstance();
var configManager = ConfigManager_1.ConfigManager.getInstance();
var Zj122Automation = /** @class */ (function () {
    function Zj122Automation() {
        this.pageHandler = null;
        this.browserService = BrowserService_1.BrowserService.getInstance();
    }
    Zj122Automation.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var page;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.browserService.launch()];
                    case 1:
                        _a.sent();
                        page = this.browserService.getPage();
                        if (page) {
                            this.pageHandler = new PageHandler_1.PageHandler(page);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Zj122Automation.prototype.destroy = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.browserService.close()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Zj122Automation.prototype.navigateToLogin = function () {
        return __awaiter(this, void 0, void 0, function () {
            var targetUrl;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.pageHandler)
                            throw new Error('Automation not initialized');
                        targetUrl = configManager.getTargetConfig().url;
                        return [4 /*yield*/, this.browserService.navigate(targetUrl)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.browserService.takeScreenshot('login_page')];
                    case 2:
                        _a.sent();
                        logger.info('Navigated to login page');
                        return [2 /*return*/];
                }
            });
        });
    };
    Zj122Automation.prototype.login = function (username, password) {
        return __awaiter(this, void 0, void 0, function () {
            var targetConfig, user, pass, verifyCodeInput, isVerifyCodeVisible, isHomePage, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.pageHandler)
                            throw new Error('Automation not initialized');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 11, , 12]);
                        targetConfig = configManager.getTargetConfig();
                        user = username || targetConfig.username;
                        pass = password || targetConfig.password;
                        if (!user || !pass) {
                            return [2 /*return*/, { success: false, message: 'Username or password not configured' }];
                        }
                        return [4 /*yield*/, this.pageHandler.fill((0, ElementLocator_1.getSelector)(ElementLocator_1.ZJ122_LOCATORS.USERNAME_INPUT), user)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.pageHandler.fill((0, ElementLocator_1.getSelector)(ElementLocator_1.ZJ122_LOCATORS.PASSWORD_INPUT), pass)];
                    case 3:
                        _a.sent();
                        verifyCodeInput = (0, ElementLocator_1.getSelector)(ElementLocator_1.ZJ122_LOCATORS.VERIFY_CODE_INPUT);
                        return [4 /*yield*/, this.pageHandler.isVisible(verifyCodeInput, { timeout: 5000 })];
                    case 4:
                        isVerifyCodeVisible = _a.sent();
                        if (!isVerifyCodeVisible) return [3 /*break*/, 6];
                        logger.warn('Verification code required');
                        return [4 /*yield*/, this.browserService.takeScreenshot('verify_code_required')];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, { success: false, message: 'Verification code required' }];
                    case 6: return [4 /*yield*/, this.pageHandler.click((0, ElementLocator_1.getSelector)(ElementLocator_1.ZJ122_LOCATORS.LOGIN_BUTTON))];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, this.browserService.waitForLoad()];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, this.browserService.takeScreenshot('after_login')];
                    case 9:
                        _a.sent();
                        return [4 /*yield*/, this.pageHandler.isVisible((0, ElementLocator_1.getSelector)(ElementLocator_1.ZJ122_LOCATORS.HOME_PAGE_TITLE), { timeout: 10000 })];
                    case 10:
                        isHomePage = _a.sent();
                        if (isHomePage) {
                            logger.info('Login successful');
                            return [2 /*return*/, { success: true, message: 'Login successful' }];
                        }
                        else {
                            logger.error('Login failed, not redirected to home page');
                            return [2 /*return*/, { success: false, message: 'Login failed, not redirected to home page' }];
                        }
                        return [3 /*break*/, 12];
                    case 11:
                        error_1 = _a.sent();
                        logger.error('Login error', error_1);
                        return [2 /*return*/, { success: false, message: 'Login error: ' + error_1.message }];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    Zj122Automation.prototype.navigateToVehicleManagement = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.pageHandler)
                            throw new Error('Automation not initialized');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.pageHandler.click((0, ElementLocator_1.getSelector)(ElementLocator_1.ZJ122_LOCATORS.VEHICLE_MANAGEMENT_MENU))];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.browserService.waitForLoad()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.browserService.takeScreenshot('vehicle_management')];
                    case 4:
                        _a.sent();
                        logger.info('Navigated to vehicle management page');
                        return [3 /*break*/, 6];
                    case 5:
                        error_2 = _a.sent();
                        logger.error('Navigate to vehicle management failed', error_2);
                        throw error_2;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Zj122Automation.prototype.navigateToDriverManagement = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.pageHandler)
                            throw new Error('Automation not initialized');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.pageHandler.click((0, ElementLocator_1.getSelector)(ElementLocator_1.ZJ122_LOCATORS.DRIVER_MANAGEMENT_MENU))];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.browserService.waitForLoad()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.browserService.takeScreenshot('driver_management')];
                    case 4:
                        _a.sent();
                        logger.info('Navigated to driver management page');
                        return [3 /*break*/, 6];
                    case 5:
                        error_3 = _a.sent();
                        logger.error('Navigate to driver management failed', error_3);
                        throw error_3;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Zj122Automation.prototype.navigateToViolationQuery = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.pageHandler)
                            throw new Error('Automation not initialized');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.pageHandler.click((0, ElementLocator_1.getSelector)(ElementLocator_1.ZJ122_LOCATORS.VIOLATION_QUERY_MENU))];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.browserService.waitForLoad()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.browserService.takeScreenshot('violation_query')];
                    case 4:
                        _a.sent();
                        logger.info('Navigated to violation query page');
                        return [3 /*break*/, 6];
                    case 5:
                        error_4 = _a.sent();
                        logger.error('Navigate to violation query failed', error_4);
                        throw error_4;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Zj122Automation.prototype.getMyVehicles = function () {
        return __awaiter(this, void 0, void 0, function () {
            var vehicles, tableLocator, rowCount, i, vehicle, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.pageHandler)
                            throw new Error('Automation not initialized');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 10, , 11]);
                        return [4 /*yield*/, this.pageHandler.click((0, ElementLocator_1.getSelector)(ElementLocator_1.ZJ122_LOCATORS.MY_VEHICLE_LINK))];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.browserService.waitForLoad()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.browserService.takeScreenshot('my_vehicles')];
                    case 4:
                        _a.sent();
                        vehicles = [];
                        tableLocator = (0, ElementLocator_1.getSelector)(ElementLocator_1.ZJ122_LOCATORS.VEHICLE_LIST_TABLE);
                        return [4 /*yield*/, this.pageHandler.executeScript('const table = document.querySelector("' + tableLocator + '"); if (!table) return 0; const rows = table.querySelectorAll("tbody tr"); return rows.length;')];
                    case 5:
                        rowCount = _a.sent();
                        i = 0;
                        _a.label = 6;
                    case 6:
                        if (!(i < rowCount)) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.pageHandler.executeScript('const table = document.querySelector("' + tableLocator + '"); const rows = table.querySelectorAll("tbody tr"); const row = rows[' + i + ']; const cells = row.querySelectorAll("td"); return { plateNumber: cells[0]?.textContent?.trim() || "", vehicleType: cells[1]?.textContent?.trim() || "", owner: cells[2]?.textContent?.trim() || "", status: cells[3]?.textContent?.trim() || "" };')];
                    case 7:
                        vehicle = _a.sent();
                        vehicles.push(vehicle);
                        _a.label = 8;
                    case 8:
                        i++;
                        return [3 /*break*/, 6];
                    case 9:
                        logger.info('Got vehicle list, total: ' + vehicles.length);
                        return [2 /*return*/, vehicles];
                    case 10:
                        error_5 = _a.sent();
                        logger.error('Get vehicle list failed', error_5);
                        throw error_5;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    Zj122Automation.prototype.getViolationList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var violations, tableLocator, rowCount, i, violation, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.pageHandler)
                            throw new Error('Automation not initialized');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 8, , 9]);
                        return [4 /*yield*/, this.navigateToViolationQuery()];
                    case 2:
                        _a.sent();
                        violations = [];
                        tableLocator = (0, ElementLocator_1.getSelector)(ElementLocator_1.ZJ122_LOCATORS.VIOLATION_LIST_TABLE);
                        return [4 /*yield*/, this.pageHandler.executeScript('const table = document.querySelector("' + tableLocator + '"); if (!table) return 0; const rows = table.querySelectorAll("tbody tr"); return rows.length;')];
                    case 3:
                        rowCount = _a.sent();
                        i = 0;
                        _a.label = 4;
                    case 4:
                        if (!(i < rowCount)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.pageHandler.executeScript('const table = document.querySelector("' + tableLocator + '"); const rows = table.querySelectorAll("tbody tr"); const row = rows[' + i + ']; const cells = row.querySelectorAll("td"); return { id: cells[0]?.textContent?.trim() || "", plateNumber: cells[1]?.textContent?.trim() || "", location: cells[2]?.textContent?.trim() || "", time: cells[3]?.textContent?.trim() || "", violation: cells[4]?.textContent?.trim() || "", penalty: cells[5]?.textContent?.trim() || "", status: cells[6]?.textContent?.trim() || "" };')];
                    case 5:
                        violation = _a.sent();
                        violations.push(violation);
                        _a.label = 6;
                    case 6:
                        i++;
                        return [3 /*break*/, 4];
                    case 7:
                        logger.info('Got violation list, total: ' + violations.length);
                        return [2 /*return*/, violations];
                    case 8:
                        error_6 = _a.sent();
                        logger.error('Get violation list failed', error_6);
                        throw error_6;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    Zj122Automation.prototype.searchViolation = function (plateNumber) {
        return __awaiter(this, void 0, void 0, function () {
            var plateInputSelector, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.pageHandler)
                            throw new Error('Automation not initialized');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 8, , 9]);
                        return [4 /*yield*/, this.navigateToViolationQuery()];
                    case 2:
                        _a.sent();
                        plateInputSelector = 'input[name="plateNumber"]';
                        return [4 /*yield*/, this.pageHandler.fill(plateInputSelector, plateNumber)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.pageHandler.click((0, ElementLocator_1.getSelector)(ElementLocator_1.ZJ122_LOCATORS.SEARCH_BUTTON))];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.browserService.waitForLoad()];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, this.browserService.takeScreenshot('violation_search_result')];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, this.getViolationList()];
                    case 7: return [2 /*return*/, _a.sent()];
                    case 8:
                        error_7 = _a.sent();
                        logger.error('Search violation failed', error_7);
                        throw error_7;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    return Zj122Automation;
}());
exports.Zj122Automation = Zj122Automation;
