"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
var winston_1 = require("winston");
var path = require("path");
var ConfigManager_1 = require("../config/ConfigManager");
var configManager = ConfigManager_1.ConfigManager.getInstance();
var logConfig = configManager.getLogConfig();
var Logger = /** @class */ (function () {
    function Logger() {
        this.logger = (0, winston_1.createLogger)({
            level: logConfig.level,
            format: winston_1.format.combine(winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.format.errors({ stack: true }), winston_1.format.splat(), winston_1.format.json()),
            defaultMeta: { service: 'ccc-browser-automation' },
            transports: [
                new winston_1.transports.File({
                    filename: path.join(logConfig.dir, 'error.log'),
                    level: 'error',
                    maxsize: 10 * 1024 * 1024,
                    maxFiles: 5,
                }),
                new winston_1.transports.File({
                    filename: path.join(logConfig.dir, 'combined.log'),
                    maxsize: 10 * 1024 * 1024,
                    maxFiles: 5,
                }),
            ],
        });
        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(new winston_1.transports.Console({
                format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.printf(function (_a) {
                    var timestamp = _a.timestamp, level = _a.level, message = _a.message, meta = __rest(_a, ["timestamp", "level", "message"]);
                    var metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                    return '[' + timestamp + '] ' + level + ': ' + message + ' ' + metaStr;
                })),
            }));
        }
    }
    Logger.getInstance = function () {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    };
    Logger.prototype.info = function (message, meta) {
        this.logger.info(message, meta);
    };
    Logger.prototype.warn = function (message, meta) {
        this.logger.warn(message, meta);
    };
    Logger.prototype.error = function (message, error, meta) {
        this.logger.error(message, __assign({ error: (error === null || error === void 0 ? void 0 : error.stack) || (error === null || error === void 0 ? void 0 : error.message) }, meta));
    };
    Logger.prototype.debug = function (message, meta) {
        this.logger.debug(message, meta);
    };
    return Logger;
}());
exports.Logger = Logger;
