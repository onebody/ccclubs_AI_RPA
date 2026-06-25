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
exports.PageHandler = void 0;
var Logger_1 = require("../logger/Logger");
var utils_1 = require("../utils");
var logger = Logger_1.Logger.getInstance();
var PageHandler = /** @class */ (function () {
    function PageHandler(page) {
        this.page = page;
    }
    PageHandler.prototype.click = function (selector, options) {
        return __awaiter(this, void 0, void 0, function () {
            var opts, error_1;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        opts = {
                            timeout: (options === null || options === void 0 ? void 0 : options.timeout) || 30000,
                            retries: (options === null || options === void 0 ? void 0 : options.retries) || 3,
                            waitForVisible: (_a = options === null || options === void 0 ? void 0 : options.waitForVisible) !== null && _a !== void 0 ? _a : true,
                        };
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, utils_1.retry)(function () { return __awaiter(_this, void 0, void 0, function () {
                                var locator;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            locator = this.page.locator(selector);
                                            if (!opts.waitForVisible) return [3 /*break*/, 2];
                                            return [4 /*yield*/, locator.waitFor({ state: 'visible', timeout: opts.timeout })];
                                        case 1:
                                            _a.sent();
                                            _a.label = 2;
                                        case 2: return [4 /*yield*/, locator.click({ timeout: opts.timeout, force: true })];
                                        case 3:
                                            _a.sent();
                                            logger.debug('Clicked element: ' + selector);
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, opts.retries)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _b.sent();
                        logger.error('Click failed: ' + selector, error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PageHandler.prototype.fill = function (selector, value, options) {
        return __awaiter(this, void 0, void 0, function () {
            var opts, error_2;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        opts = {
                            timeout: (options === null || options === void 0 ? void 0 : options.timeout) || 30000,
                            retries: (options === null || options === void 0 ? void 0 : options.retries) || 3,
                            clearFirst: (_a = options === null || options === void 0 ? void 0 : options.clearFirst) !== null && _a !== void 0 ? _a : true,
                        };
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, utils_1.retry)(function () { return __awaiter(_this, void 0, void 0, function () {
                                var locator;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            locator = this.page.locator(selector);
                                            return [4 /*yield*/, locator.waitFor({ state: 'visible', timeout: opts.timeout })];
                                        case 1:
                                            _a.sent();
                                            if (!opts.clearFirst) return [3 /*break*/, 3];
                                            return [4 /*yield*/, locator.fill('', { timeout: opts.timeout })];
                                        case 2:
                                            _a.sent();
                                            _a.label = 3;
                                        case 3: return [4 /*yield*/, locator.fill(value, { timeout: opts.timeout })];
                                        case 4:
                                            _a.sent();
                                            logger.debug('Filled input: ' + selector + ' = ' + value);
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, opts.retries)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _b.sent();
                        logger.error('Fill failed: ' + selector, error_2);
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PageHandler.prototype.getText = function (selector, options) {
        return __awaiter(this, void 0, void 0, function () {
            var opts, error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        opts = {
                            timeout: (options === null || options === void 0 ? void 0 : options.timeout) || 30000,
                            retries: (options === null || options === void 0 ? void 0 : options.retries) || 3,
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, utils_1.retry)(function () { return __awaiter(_this, void 0, void 0, function () {
                                var locator, text;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            locator = this.page.locator(selector);
                                            return [4 /*yield*/, locator.waitFor({ state: 'visible', timeout: opts.timeout })];
                                        case 1:
                                            _a.sent();
                                            return [4 /*yield*/, locator.textContent()];
                                        case 2:
                                            text = _a.sent();
                                            logger.debug('Got text: ' + selector + ' = ' + text);
                                            return [2 /*return*/, text || ''];
                                    }
                                });
                            }); }, opts.retries)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_3 = _a.sent();
                        logger.error('Get text failed: ' + selector, error_3);
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PageHandler.prototype.isVisible = function (selector, options) {
        return __awaiter(this, void 0, void 0, function () {
            var opts, locator, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        opts = { timeout: (options === null || options === void 0 ? void 0 : options.timeout) || 5000 };
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        locator = this.page.locator(selector);
                        return [4 /*yield*/, locator.waitFor({ state: 'visible', timeout: opts.timeout })];
                    case 2:
                        _b.sent();
                        return [2 /*return*/, true];
                    case 3:
                        _a = _b.sent();
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PageHandler.prototype.waitForElement = function (selector, options) {
        return __awaiter(this, void 0, void 0, function () {
            var opts, locator, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        opts = {
                            timeout: (options === null || options === void 0 ? void 0 : options.timeout) || 30000,
                            state: (options === null || options === void 0 ? void 0 : options.state) || 'visible',
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        locator = this.page.locator(selector);
                        return [4 /*yield*/, locator.waitFor({ state: opts.state, timeout: opts.timeout })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, locator];
                    case 3:
                        error_4 = _a.sent();
                        logger.error('Wait for element failed: ' + selector, error_4);
                        throw error_4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PageHandler.prototype.waitForNavigation = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var opts, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        opts = {
                            timeout: (options === null || options === void 0 ? void 0 : options.timeout) || 30000,
                            waitUntil: (options === null || options === void 0 ? void 0 : options.waitUntil) || 'networkidle',
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.page.waitForNavigation({ waitUntil: opts.waitUntil, timeout: opts.timeout })];
                    case 2:
                        _a.sent();
                        logger.debug('Navigation complete');
                        return [3 /*break*/, 4];
                    case 3:
                        error_5 = _a.sent();
                        logger.error('Wait for navigation failed', error_5);
                        throw error_5;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PageHandler.prototype.executeScript = function (script) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.page.evaluate(script)];
                    case 1:
                        result = _a.sent();
                        logger.debug('Script executed: ' + script.substring(0, 50) + '...');
                        return [2 /*return*/, result];
                    case 2:
                        error_6 = _a.sent();
                        logger.error('Script execution failed', error_6);
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return PageHandler;
}());
exports.PageHandler = PageHandler;
