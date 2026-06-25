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
exports.BrowserService = void 0;
var test_1 = require("@playwright/test");
var ConfigManager_1 = require("../config/ConfigManager");
var Logger_1 = require("../logger/Logger");
var utils_1 = require("../utils");
var path = require("path");
var configManager = ConfigManager_1.ConfigManager.getInstance();
var logger = Logger_1.Logger.getInstance();
var browserConfig = configManager.getBrowserConfig();
var BrowserService = /** @class */ (function () {
    function BrowserService() {
        this.browser = null;
        this.context = null;
        this.page = null;
    }
    BrowserService.getInstance = function () {
        if (!BrowserService.instance) {
            BrowserService.instance = new BrowserService();
        }
        return BrowserService.instance;
    };
    BrowserService.prototype.launch = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, error_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 5, , 6]);
                        logger.info('Starting browser...');
                        _a = this;
                        return [4 /*yield*/, test_1.chromium.launch({
                                headless: browserConfig.headless,
                                slowMo: browserConfig.slowMo,
                                ignoreDefaultArgs: ['--enable-automation'],
                                args: [
                                    '--disable-blink-features=AutomationControlled',
                                    '--ignore-certificate-errors',
                                    '--ignore-ssl-errors',
                                    '--allow-insecure-localhost',
                                    '--window-size=' + browserConfig.width + ',' + browserConfig.height,
                                ],
                            })];
                    case 1:
                        _a.browser = _d.sent();
                        _b = this;
                        return [4 /*yield*/, this.browser.newContext({
                                viewport: {
                                    width: browserConfig.width,
                                    height: browserConfig.height,
                                },
                                ignoreHTTPSErrors: browserConfig.ignoreHttpsErrors,
                                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            })];
                    case 2:
                        _b.context = _d.sent();
                        return [4 /*yield*/, this.context.addInitScript(function () {
                                Object.defineProperty(navigator, 'webdriver', {
                                    get: function () { return undefined; },
                                });
                            })];
                    case 3:
                        _d.sent();
                        _c = this;
                        return [4 /*yield*/, this.context.newPage()];
                    case 4:
                        _c.page = _d.sent();
                        this.page.setDefaultTimeout(browserConfig.timeout);
                        logger.info('Browser launched successfully');
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _d.sent();
                        logger.error('Browser launch failed', error_1);
                        throw error_1;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    BrowserService.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        logger.info('Closing browser...');
                        if (!this.page) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.page.close()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.context) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.context.close()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        if (!this.browser) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.browser.close()];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        this.page = null;
                        this.context = null;
                        this.browser = null;
                        logger.info('Browser closed successfully');
                        return [3 /*break*/, 8];
                    case 7:
                        error_2 = _a.sent();
                        logger.error('Browser close failed', error_2);
                        throw error_2;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    BrowserService.prototype.getPage = function () { return this.page; };
    BrowserService.prototype.getContext = function () { return this.context; };
    BrowserService.prototype.navigate = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.page)
                            throw new Error('Browser not launched');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        logger.info('Navigating to: ' + url);
                        return [4 /*yield*/, this.page.goto(url, {
                                waitUntil: 'networkidle',
                                timeout: browserConfig.timeout,
                            })];
                    case 2:
                        _a.sent();
                        logger.info('Navigation successful');
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        logger.error('Navigation failed: ' + url, error_3);
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BrowserService.prototype.takeScreenshot = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var fileName, filePath, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.page)
                            throw new Error('Browser not launched');
                        fileName = name || 'screenshot_' + (0, utils_1.generateTimestamp)();
                        filePath = path.join(configManager.getScreenshotDir(), fileName + '.png');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.page.screenshot({ path: filePath, fullPage: true })];
                    case 2:
                        _a.sent();
                        logger.info('Screenshot saved: ' + filePath);
                        return [2 /*return*/, filePath];
                    case 3:
                        error_4 = _a.sent();
                        logger.error('Screenshot failed', error_4);
                        throw error_4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BrowserService.prototype.waitForLoad = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.page)
                            throw new Error('Browser not launched');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.page.waitForLoadState('networkidle')];
                    case 2:
                        _a.sent();
                        logger.debug('Page loaded');
                        return [3 /*break*/, 4];
                    case 3:
                        error_5 = _a.sent();
                        logger.error('Wait for load failed', error_5);
                        throw error_5;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return BrowserService;
}());
exports.BrowserService = BrowserService;
