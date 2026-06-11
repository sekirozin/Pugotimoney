import { Request, Response } from 'express';
import { Database } from '../models/database';

const db = new Database();

export async function getProfile(req: Request, res: Response) {
    try {
        const user = await db.getUserById((req as any).user.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        }
        res.json({ success: true, data: user });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function updateProfile(req: Request, res: Response) {
    try {
        const { bio, location, avatar_url } = req.body;
        await db.updateProfile((req as any).user.id, { bio, location, avatar_url });
        const user = await db.getUserById((req as any).user.id);
        res.json({ success: true, data: user });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
}
