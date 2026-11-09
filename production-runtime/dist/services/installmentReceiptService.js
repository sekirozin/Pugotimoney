"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installmentReceiptsDir = void 0;
exports.installmentReceiptUpload = installmentReceiptUpload;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
exports.installmentReceiptsDir = path_1.default.join(__dirname, '../../Comprovantes');
fs_1.default.mkdirSync(exports.installmentReceiptsDir, { recursive: true });
const extensionByMime = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
};
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: exports.installmentReceiptsDir,
        filename: (_req, file, callback) => {
            callback(null, `${crypto_1.default.randomUUID()}${extensionByMime[file.mimetype] || ''}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        if (extensionByMime[file.mimetype]) {
            callback(null, true);
            return;
        }
        callback(new Error('Formato inválido. Envie PDF, PNG, JPG ou WEBP.'));
    }
});
function installmentReceiptUpload(req, res, next) {
    upload.single('receipt')(req, res, (error) => {
        if (!error) {
            next();
            return;
        }
        const message = error instanceof multer_1.default.MulterError && error.code === 'LIMIT_FILE_SIZE'
            ? 'O comprovante deve ter no máximo 10 MB.'
            : error instanceof Error ? error.message : 'Não foi possível enviar o comprovante.';
        res.status(400).json({ success: false, error: message });
    });
}
//# sourceMappingURL=installmentReceiptService.js.map