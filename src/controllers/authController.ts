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
    avatar_url?: string;
    avatar?: string;
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

export function getPugotiLabSession(req: Request): PugotiLabSession {
    const secret = process.env.PUGOTILAB_AUTH_SECRET;
    const token = getCookie(req, 'pugotilab_session');
    if (!secret || !token) throw new Error('Sessão Pugotilab não encontrada');

    return jwt.verify(token, secret, {
        issuer: 'pugotilab-auth',
        audience: 'pugotilab-services'
    }) as PugotiLabSession;
}

function sessionUser(
    session: PugotiLabSession,
    user: { id: number; username: string; role: string },
    token?: string
) {
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
    async sso(req: Request, res: Response) {
        try {
            const session = getPugotiLabSession(req);
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
            res.json({ success: true, data: sessionUser(session, user, localToken) });
        } catch {
            res.status(401).json({ success: false, error: 'Sessão Pugotilab inválida ou expirada' });
        }
    }

    async me(req: AuthRequest, res: Response) {
        try {
            const session = getPugotiLabSession(req);
            if (!req.user || session.username.toLowerCase() !== req.user.username.toLowerCase()) {
                return res.status(401).json({ success: false, error: 'Sessão Pugotilab incompatível' });
            }
            res.json({ success: true, data: sessionUser(session, req.user) });
        } catch {
            res.status(401).json({ success: false, error: 'Sessão Pugotilab inválida ou expirada' });
        }
    }
}

export const authController = new AuthController();
