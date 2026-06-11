"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../models/database");
const auth_1 = require("../middleware/auth");
class AuthController {
    async register(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ success: false, error: 'Usuário e senha são obrigatórios' });
            }
            if (password.length < 8) {
                return res.status(400).json({ success: false, error: 'A senha deve ter pelo menos 8 caracteres' });
            }
            if (!/[A-Z]/.test(password)) {
                return res.status(400).json({ success: false, error: 'A senha deve conter pelo menos uma letra maiúscula' });
            }
            if (!/[0-9]/.test(password)) {
                return res.status(400).json({ success: false, error: 'A senha deve conter pelo menos um número' });
            }
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                return res.status(400).json({ success: false, error: 'A senha deve conter pelo menos um caractere especial' });
            }
            const existing = await database_1.database.getUserByUsername(username);
            if (existing) {
                return res.status(400).json({ success: false, error: 'Usuário já existe' });
            }
            const userCount = await database_1.database.getUserCount();
            const role = userCount === 0 ? 'admin' : 'user';
            const hashedPassword = await bcrypt_1.default.hash(password, 10);
            const id = await database_1.database.addUser({ username, password: hashedPassword, role });
            const token = (0, auth_1.generateToken)({ id, username, role });
            res.json({ success: true, data: { id, username, role, token } });
        }
        catch (error) {
            console.error('Erro ao registrar usuário:', error);
            res.status(500).json({ success: false, error: 'Erro ao registrar usuário' });
        }
    }
    async login(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ success: false, error: 'Usuário e senha são obrigatórios' });
            }
            const user = await database_1.database.getUserByUsername(username);
            if (!user) {
                return res.status(401).json({ success: false, error: 'Usuário ou senha inválidos' });
            }
            const valid = await bcrypt_1.default.compare(password, user.password);
            if (!valid) {
                return res.status(401).json({ success: false, error: 'Usuário ou senha inválidos' });
            }
            const token = (0, auth_1.generateToken)({ id: user.id, username: user.username, role: user.role });
            res.json({ success: true, data: { id: user.id, username: user.username, role: user.role, token } });
        }
        catch (error) {
            console.error('Erro ao fazer login:', error);
            res.status(500).json({ success: false, error: 'Erro ao fazer login' });
        }
    }
    async me(req, res) {
        res.json({ success: true, data: req.user });
    }
    async checkFirstUser(req, res) {
        try {
            const count = await database_1.database.getUserCount();
            res.json({ success: true, data: { hasUsers: count > 0 } });
        }
        catch (error) {
            res.status(500).json({ success: false, error: 'Erro ao verificar usuários' });
        }
    }
}
exports.authController = new AuthController();
//# sourceMappingURL=authController.js.map