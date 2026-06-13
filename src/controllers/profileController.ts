import { Request, Response } from 'express';

const profileUrl = process.env.PUGOTILAB_PROFILE_URL
    || 'http://pugotilab-auth:8080/auth/api/profile';

async function proxyProfile(
    req: Request,
    res: Response,
    method: 'GET' | 'PATCH',
    body?: Record<string, unknown>
) {
    try {
        const response = await fetch(profileUrl, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Cookie: req.headers.cookie || ''
            },
            body: body ? JSON.stringify(body) : undefined
        });
        const payload = await response.json() as {
            profile?: unknown;
            error?: string;
        };
        if (!response.ok || !payload.profile) {
            return res.status(response.status).json({
                success: false,
                error: payload.error || 'Perfil Pugotilab indisponível'
            });
        }
        res.json({ success: true, data: payload.profile });
    } catch (error) {
        console.error('Erro ao acessar Pugotiprofile:', error);
        res.status(502).json({
            success: false,
            error: 'Não foi possível acessar o perfil Pugotilab'
        });
    }
}

export async function getProfile(req: Request, res: Response) {
    return proxyProfile(req, res, 'GET');
}

export async function updateProfile(req: Request, res: Response) {
    const { nickname, avatarUrl, biography, location } = req.body;
    return proxyProfile(req, res, 'PATCH', {
        nickname,
        avatarUrl,
        biography,
        location
    });
}
