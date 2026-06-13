import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { database } from '../models/database';
import { generateToken, AuthRequest } from '../middleware/auth';

type PugotiLabSession = {
    sub: string;
    username: string;
    displayName?: string;
    nickname?: string;
    avatarUrl?: string;
    biography?: string;
    location?: string;
    email?: string;
    role: string;
    iss: string;
    aud: string;
};

function getCookie(req: Request, name: string): string | null {
    const header = req.headers.cookie;
    if (!header) return null;
    for (const item of header.split(';')) {
        const [key, ...value] = item.trim().split('=');
        if (key === name) return decodeURIComponent(value.join('='));
    }
    return null;
}

class AuthController {
    async sso(req: Request, res: Response) {
        try {
            const secret = process.env.PUGOTILAB_AUTH_SECRET;
            const token = getCookie(req, 'pugotilab_session');
            if (!secret || !token) {
                return res.status(401).json({ success: false, error: 'Sessão PugotiLab não encontrada' });
            }

            const session = jwt.verify(token, secret, {
                issuer: 'pugotilab-auth',
                audience: 'pugotilab-services'
            }) as PugotiLabSession;

            let user = await database.getUserByUsername(session.username);
            if (!user) {
                const password = await bcrypt.hash(crypto.randomUUID(), 12);
                await database.addUser({ username: session.username, password, role: 'user' });
                user = await database.getUserByUsername(session.username);
            }
            if (!user) {
                return res.status(500).json({ success: false, error: 'Falha ao provisionar usuário' });
            }

            const localToken = generateToken({ id: user.id, username: user.username, role: user.role });
            res.json({
                success: true,
                data: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    displayName: session.displayName || session.username,
                    nickname: session.nickname || '',
                    avatarUrl: session.avatarUrl || '',
                    biography: session.biography || '',
                    location: session.location || '',
                    token: localToken
                }
            });
        } catch {
            res.status(401).json({ success: false, error: 'Sessão PugotiLab inválida ou expirada' });
        }
    }

    async register(req: Request, res: Response) {
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

            const existing = await database.getUserByUsername(username);
            if (existing) {
                return res.status(400).json({ success: false, error: 'Usuário já existe' });
            }

            const userCount = await database.getUserCount();
            const role = userCount === 0 ? 'admin' : 'user';

            const hashedPassword = await bcrypt.hash(password, 10);
            const id = await database.addUser({ username, password: hashedPassword, role });
            await database.assignLegacyDataToUser(id);

            const token = generateToken({ id, username, role });
            res.json({ success: true, data: { id, username, role, token } });
        } catch (error) {
            console.error('Erro ao registrar usuário:', error);
            res.status(500).json({ success: false, error: 'Erro ao registrar usuário' });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ success: false, error: 'Usuário e senha são obrigatórios' });
            }

            const user = await database.getUserByUsername(username);
            if (!user) {
                return res.status(401).json({ success: false, error: 'Usuário ou senha inválidos' });
            }

            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                return res.status(401).json({ success: false, error: 'Usuário ou senha inválidos' });
            }

            const token = generateToken({ id: user.id, username: user.username, role: user.role });
            res.json({ success: true, data: { id: user.id, username: user.username, role: user.role, token } });
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            res.status(500).json({ success: false, error: 'Erro ao fazer login' });
        }
    }

    async me(req: AuthRequest, res: Response) {
        res.json({ success: true, data: req.user });
    }

    async checkFirstUser(req: Request, res: Response) {
        try {
            const count = await database.getUserCount();
            res.json({ success: true, data: { hasUsers: count > 0 } });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Erro ao verificar usuários' });
        }
    }
}

export const authController = new AuthController();
