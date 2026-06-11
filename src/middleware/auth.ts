import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { database } from '../models/database';

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET não configurado');
    }
    return secret;
}

export interface AuthRequest extends Request {
    user?: { id: number; username: string; role: string };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, getJwtSecret()) as { id: number; username: string; role: string };
        const currentUser = await database.getUserById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({ success: false, error: 'Usuário não encontrado' });
        }

        req.user = {
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role
        };
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
    }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Acesso restrito a administradores' });
    }
    next();
}

export function generateToken(user: { id: number; username: string; role: string }): string {
    return jwt.sign({ id: user.id, username: user.username, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
}
