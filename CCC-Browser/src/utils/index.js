"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = delay;
exports.generateTimestamp = generateTimestamp;
exports.retry = retry;
exports.sanitizeFileName = sanitizeFileName;
function delay(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
function generateTimestamp() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    var hours = String(now.getHours()).padStart(2, '0');
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var seconds = String(now.getSeconds()).padStart(2, '0');
    return year + month + day + '_' + hours + minutes + seconds;
}
function retry(fn, retries, delayMs) {
    if (retries === void 0) { retries = 3; }
    if (delayMs === void 0) { delayMs = 1000; }
    return fn().catch(function (error) {
        if (retries > 0) {
            return delay(delayMs).then(function () { return retry(fn, retries - 1, delayMs * 2); });
        }
        throw error;
    });
}
function sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_');
}
