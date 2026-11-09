"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
exports.getPugotiLabSession = getPugotiLabSession;
const bcrypt_1 = __importDefault(require("bcrypt"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../models/database");
const auth_1 = require("../middleware/auth");
function getCookie(req, name) {
    const header = req.headers.cookie;
    if (!header)
        return null;
    for (const item of header.split(';')) {
        const [key, ...value] = item.trim().split('=');
        if (key === name)
            return decodeURIComponent(value.join('='));
    }
    return null;
}
function getPugotiLabSession(req) {
    const secret = process.env.PUGOTILAB_AUTH_SECRET;
    const token = getCookie(req, 'pugotilab_session');
    if (!secret || !token)
        throw new Error('Sessão Pugotilab não encontrada');
    return jsonwebtoken_1.default.verify(token, secret, {
        issuer: 'pugotilab-auth',
        audience: 'pugotilab-services'
    });
}
function sessionUser(session, user, token) {
    return {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: session.displayName || session.username,
        nickname: session.nickname || '',
        avatarUrl: session.avatarUrl || session.avatar_url || session.avatar || '',
        biography: session.biography || '',
        location: session.location || '',
        ...(token ? { token } : {})
    };
}
class AuthController {
    async sso(req, res) {
        try {
            const session = getPugotiLabSession(req);
            let user = await database_1.database.getUserByUsername(session.username);
            if (!user) {
                const password = await bcrypt_1.default.hash(node_crypto_1.default.randomUUID(), 12);
                await database_1.database.addUser({ username: session.username, password, role: 'user' });
                user = await database_1.database.getUserByUsername(session.username);
            }
            if (!user) {
                return res.status(500).json({ success: false, error: 'Falha ao provisionar usuário' });
            }
            const localToken = (0, auth_1.generateToken)({ id: user.id, username: user.username, role: user.role });
            res.json({ success: true, data: sessionUser(session, user, localToken) });
        }
        catch {
            res.status(401).json({ success: false, error: 'Sessão Pugotilab inválida ou expirada' });
        }
    }
    async me(req, res) {
        try {
            const session = getPugotiLabSession(req);
            if (!req.user || session.username.toLowerCase() !== req.user.username.toLowerCase()) {
                return res.status(401).json({ success: false, error: 'Sessão Pugotilab incompatível' });
            }
            res.json({ success: true, data: sessionUser(session, req.user) });
        }
        catch {
            res.status(401).json({ success: false, error: 'Sessão Pugotilab inválida ou expirada' });
        }
    }
}
exports.authController = new AuthController();
//# sourceMappingURL=authController.js.map