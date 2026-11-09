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

// Sessão Pugotilab ainda ativa? (Sair ou "Sessões abertas" no Pugoti Profile derrubam o acesso aqui também.)
// Cache de 3 s por cookie para não consultar o auth a cada imagem; auth fora do ar não derruba quem já entrou.
const validacoesPugotilab = new Map();
async function sessaoPugotilabAtiva(token, url) {
    if (!token) return false;
    const guardada = validacoesPugotilab.get(token);
    if (guardada && Date.now() - guardada.em < 3000) return guardada.ativa;
    let ativa = true;
    try {
        const resposta = await fetch(url, { headers: { Cookie: `pugotilab_session=${encodeURIComponent(token)}` }, signal: AbortSignal.timeout(5000) });
        if (resposta.status === 401 || resposta.status === 403) ativa = false;
    } catch { /* auth indisponível: mantém o acesso */ }
    if (validacoesPugotilab.size > 2000) validacoesPugotilab.delete(validacoesPugotilab.keys().next().value);
    validacoesPugotilab.set(token, { ativa, em: Date.now() });
    return ativa;
}
function cookiePugotilab(req) {
    for (const parte of String(req.headers.cookie || '').split(';')) {
        const [nome, ...valor] = parte.trim().split('=');
        if (nome === 'pugotilab_session') return decodeURIComponent(valor.join('='));
    }
    return '';
}
const urlSessaoPugotilab = process.env.PUGOTILAB_SESSION_URL || 'http://pugotilab-auth:8080/auth/api/session';
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
        if (!(await sessaoPugotilabAtiva(cookiePugotilab(req), urlSessaoPugotilab))) {
            return res.status(401).json({ success: false, error: 'Sessão Pugotilab encerrada' });
        }
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