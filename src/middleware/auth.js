"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.adminMiddleware = adminMiddleware;
exports.generateToken = generateToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../models/database");
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET não configurado');
    }
    return secret;
}
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, getJwtSecret());
        const currentUser = await database_1.database.getUserById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({ success: false, error: 'Usuário não encontrado' });
        }
        req.user = {
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
    }
}
function adminMiddleware(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Acesso restrito a administradores' });
    }
    next();
}
function generateToken(user) {
    return jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
}
//# sourceMappingURL=auth.js.map