"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
var dotenv = require("dotenv");
var fs = require("fs");
var path = require("path");
var ConfigManager = /** @class */ (function () {
    function ConfigManager() {
        this.loadConfig();
    }
    ConfigManager.getInstance = function () {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    };
    ConfigManager.prototype.loadConfig = function () {
        dotenv.config({ path: path.join(__dirname, '../../.env') });
        var env = process.env;
        this.config = {
            browser: {
                headless: env.BROWSER_HEADLESS === 'true',
                timeout: parseInt(env.BROWSER_TIMEOUT || '30000', 10),
                width: parseInt(env.BROWSER_WIDTH || '1920', 10),
                height: parseInt(env.BROWSER_HEIGHT || '1080', 10),
                ignoreHttpsErrors: true,
                slowMo: parseInt(env.BROWSER_SLOWMO || '0', 10),
            },
            log: {
                level: env.LOG_LEVEL || 'info',
                dir: env.LOG_DIR || './logs',
            },
            screenshot: {
                dir: env.SCREENSHOT_DIR || './screenshots',
            },
            target: {
                url: env.TARGET_URL || 'https://zj.122.gov.cn',
                username: env.USERNAME || '',
                password: env.PASSWORD || '',
            },
        };
        this.ensureDirectories();
    };
    ConfigManager.prototype.ensureDirectories = function () {
        if (!fs.existsSync(this.config.log.dir)) {
            fs.mkdirSync(this.config.log.dir, { recursive: true });
        }
        if (!fs.existsSync(this.config.screenshot.dir)) {
            fs.mkdirSync(this.config.screenshot.dir, { recursive: true });
        }
    };
    ConfigManager.prototype.getConfig = function () { return this.config; };
    ConfigManager.prototype.getBrowserConfig = function () { return this.config.browser; };
    ConfigManager.prototype.getLogConfig = function () { return this.config.log; };
    ConfigManager.prototype.getTargetConfig = function () { return this.config.target; };
    ConfigManager.prototype.getScreenshotDir = function () { return this.config.screenshot.dir; };
    return ConfigManager;
}());
exports.ConfigManager = ConfigManager;
