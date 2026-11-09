import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

export const installmentReceiptsDir = path.join(__dirname, '../../Comprovantes');
fs.mkdirSync(installmentReceiptsDir, { recursive: true });

const extensionByMime: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
};

const upload = multer({
    storage: multer.diskStorage({
        destination: installmentReceiptsDir,
        filename: (_req, file, callback) => {
            callback(null, `${crypto.randomUUID()}${extensionByMime[file.mimetype] || ''}`);
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

export function installmentReceiptUpload(req: Request, res: Response, next: NextFunction): void {
    upload.single('receipt')(req, res, (error: unknown) => {
        if (!error) {
            next();
            return;
        }
        const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
            ? 'O comprovante deve ter no máximo 10 MB.'
            : error instanceof Error ? error.message : 'Não foi possível enviar o comprovante.';
        res.status(400).json({ success: false, error: message });
    });
}
