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
var AutomationEngine_1 = require("../src/core/AutomationEngine");
var Logger_1 = require("../src/logger/Logger");
var logger = Logger_1.Logger.getInstance();
function runTests() {
    return __awaiter(this, void 0, void 0, function () {
        var engine, tests, passed, failed, _i, tests_1, test, result, error_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.info('=== Automation Tool Tests Started ===');
                    engine = new AutomationEngine_1.AutomationEngine();
                    tests = [
                        {
                            name: 'Start automation engine',
                            run: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, engine.start()];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); },
                        },
                        {
                            name: 'Stop automation engine',
                            run: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, engine.stop()];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); },
                        },
                    ];
                    passed = 0;
                    failed = 0;
                    _i = 0, tests_1 = tests;
                    _a.label = 1;
                case 1:
                    if (!(_i < tests_1.length)) return [3 /*break*/, 6];
                    test = tests_1[_i];
                    logger.info('Test: ' + test.name);
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, test.run()];
                case 3:
                    result = _a.sent();
                    if (result.success) {
                        logger.info('Passed');
                        passed++;
                    }
                    else {
                        logger.error('Failed: ' + result.error);
                        failed++;
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    logger.error('Failed: ' + error_1.message);
                    failed++;
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    logger.info('=== Tests Completed ===');
                    logger.info('Passed: ' + passed + ', Failed: ' + failed);
                    if (failed > 0) {
                        process.exit(1);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
runTests().catch(function (error) {
    console.error('Test run failed:', error);
    process.exit(1);
});
