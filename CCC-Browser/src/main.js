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
var AutomationEngine_1 = require("./core/AutomationEngine");
var Logger_1 = require("./logger/Logger");
var dotenv = require("dotenv");
var path = require("path");
dotenv.config({ path: path.join(__dirname, '../.env') });
var logger = Logger_1.Logger.getInstance();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var engine, args, command, _a, result, result, result, plateNumber, result, result, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    logger.info('=== CCC-Browser Automation Tool Started ===');
                    engine = new AutomationEngine_1.AutomationEngine();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 15, 16, 18]);
                    return [4 /*yield*/, engine.start()];
                case 2:
                    _b.sent();
                    args = process.argv.slice(2);
                    command = args[0] || 'full';
                    _a = command;
                    switch (_a) {
                        case 'login': return [3 /*break*/, 3];
                        case 'vehicles': return [3 /*break*/, 5];
                        case 'violations': return [3 /*break*/, 7];
                        case 'search': return [3 /*break*/, 9];
                        case 'full': return [3 /*break*/, 11];
                    }
                    return [3 /*break*/, 13];
                case 3:
                    logger.info('Executing login...');
                    return [4 /*yield*/, engine.login()];
                case 4:
                    result = _b.sent();
                    logger.info('Login result:', result);
                    return [3 /*break*/, 14];
                case 5:
                    logger.info('Executing get vehicles...');
                    return [4 /*yield*/, engine.getVehicles()];
                case 6:
                    result = _b.sent();
                    logger.info('Vehicles:', JSON.stringify(result.data, null, 2));
                    return [3 /*break*/, 14];
                case 7:
                    logger.info('Executing get violations...');
                    return [4 /*yield*/, engine.getViolations()];
                case 8:
                    result = _b.sent();
                    logger.info('Violations:', JSON.stringify(result.data, null, 2));
                    return [3 /*break*/, 14];
                case 9:
                    plateNumber = args[1];
                    if (!plateNumber) {
                        logger.error('Please provide plate number');
                        return [3 /*break*/, 14];
                    }
                    logger.info('Searching violation for plate: ' + plateNumber);
                    return [4 /*yield*/, engine.searchViolation(plateNumber)];
                case 10:
                    result = _b.sent();
                    logger.info('Search result:', JSON.stringify(result.data, null, 2));
                    return [3 /*break*/, 14];
                case 11:
                    logger.info('Executing full automation flow...');
                    return [4 /*yield*/, engine.executeFullFlow()];
                case 12:
                    result = _b.sent();
                    if (result.success && result.data) {
                        logger.info('Login status:', result.data.login);
                        logger.info('Vehicle count:', result.data.vehicles.length);
                        logger.info('Violation count:', result.data.violations.length);
                    }
                    else {
                        logger.error('Flow failed:', result.error);
                    }
                    return [3 /*break*/, 14];
                case 13:
                    {
                        logger.error('Unknown command: ' + command);
                        logger.info('Available commands: login, vehicles, violations, search [plate], full');
                        return [3 /*break*/, 14];
                    }
                    _b.label = 14;
                case 14: return [3 /*break*/, 18];
                case 15:
                    error_1 = _b.sent();
                    logger.error('Main execution error', error_1);
                    return [3 /*break*/, 18];
                case 16: return [4 /*yield*/, engine.stop()];
                case 17:
                    _b.sent();
                    logger.info('=== CCC-Browser Automation Tool Exited ===');
                    return [7 /*endfinally*/];
                case 18: return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error('Application failed to start:', error);
    process.exit(1);
});
