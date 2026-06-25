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
exports.AutomationEngine = void 0;
var Zj122Automation_1 = require("../automation/Zj122Automation");
var Logger_1 = require("../logger/Logger");
var logger = Logger_1.Logger.getInstance();
var AutomationEngine = /** @class */ (function () {
    function AutomationEngine() {
        this.automation = new Zj122Automation_1.Zj122Automation();
    }
    AutomationEngine.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        logger.info('Starting automation engine...');
                        return [4 /*yield*/, this.automation.init()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, { success: true, timestamp: new Date() }];
                    case 2:
                        error_1 = _a.sent();
                        logger.error('Start automation engine failed', error_1);
                        return [2 /*return*/, { success: false, error: error_1.message, timestamp: new Date() }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AutomationEngine.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        logger.info('Stopping automation engine...');
                        return [4 /*yield*/, this.automation.destroy()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, { success: true, timestamp: new Date() }];
                    case 2:
                        error_2 = _a.sent();
                        logger.error('Stop automation engine failed', error_2);
                        return [2 /*return*/, { success: false, error: error_2.message, timestamp: new Date() }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AutomationEngine.prototype.executeFullFlow = function (username, password) {
        return __awaiter(this, void 0, void 0, function () {
            var result, _a, _b, _c, error_3;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 5, , 6]);
                        result = {
                            login: {},
                            vehicles: [],
                            violations: [],
                        };
                        logger.info('Executing full automation flow...');
                        return [4 /*yield*/, this.automation.navigateToLogin()];
                    case 1:
                        _d.sent();
                        _a = result;
                        return [4 /*yield*/, this.automation.login(username, password)];
                    case 2:
                        _a.login = _d.sent();
                        if (!result.login.success) {
                            return [2 /*return*/, { success: false, error: result.login.message, timestamp: new Date() }];
                        }
                        _b = result;
                        return [4 /*yield*/, this.automation.getMyVehicles()];
                    case 3:
                        _b.vehicles = _d.sent();
                        _c = result;
                        return [4 /*yield*/, this.automation.getViolationList()];
                    case 4:
                        _c.violations = _d.sent();
                        logger.info('Full automation flow completed');
                        return [2 /*return*/, { success: true, data: result, timestamp: new Date() }];
                    case 5:
                        error_3 = _d.sent();
                        logger.error('Execute full flow failed', error_3);
                        return [2 /*return*/, { success: false, error: error_3.message, timestamp: new Date() }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    AutomationEngine.prototype.login = function (username, password) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.automation.navigateToLogin()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.automation.login(username, password)];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, { success: result.success, data: result, timestamp: new Date() }];
                    case 3:
                        error_4 = _a.sent();
                        logger.error('Login failed', error_4);
                        return [2 /*return*/, { success: false, error: error_4.message, timestamp: new Date() }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AutomationEngine.prototype.getVehicles = function () {
        return __awaiter(this, void 0, void 0, function () {
            var vehicles, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.automation.getMyVehicles()];
                    case 1:
                        vehicles = _a.sent();
                        return [2 /*return*/, { success: true, data: vehicles, timestamp: new Date() }];
                    case 2:
                        error_5 = _a.sent();
                        logger.error('Get vehicles failed', error_5);
                        return [2 /*return*/, { success: false, error: error_5.message, timestamp: new Date() }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AutomationEngine.prototype.getViolations = function () {
        return __awaiter(this, void 0, void 0, function () {
            var violations, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.automation.getViolationList()];
                    case 1:
                        violations = _a.sent();
                        return [2 /*return*/, { success: true, data: violations, timestamp: new Date() }];
                    case 2:
                        error_6 = _a.sent();
                        logger.error('Get violations failed', error_6);
                        return [2 /*return*/, { success: false, error: error_6.message, timestamp: new Date() }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AutomationEngine.prototype.searchViolation = function (plateNumber) {
        return __awaiter(this, void 0, void 0, function () {
            var violations, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.automation.searchViolation(plateNumber)];
                    case 1:
                        violations = _a.sent();
                        return [2 /*return*/, { success: true, data: violations, timestamp: new Date() }];
                    case 2:
                        error_7 = _a.sent();
                        logger.error('Search violation failed', error_7);
                        return [2 /*return*/, { success: false, error: error_7.message, timestamp: new Date() }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return AutomationEngine;
}());
exports.AutomationEngine = AutomationEngine;
