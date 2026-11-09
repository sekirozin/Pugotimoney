"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
const profileUrl = process.env.PUGOTILAB_PROFILE_URL
    || 'http://pugotilab-auth:8080/auth/api/profile';
async function proxyProfile(req, res, method, body) {
    try {
        const response = await fetch(profileUrl, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Cookie: req.headers.cookie || ''
            },
            body: body ? JSON.stringify(body) : undefined
        });
        const payload = await response.json();
        if (!response.ok || !payload.profile) {
            return res.status(response.status).json({
                success: false,
                error: payload.error || 'Perfil Pugotilab indisponível'
            });
        }
        res.json({ success: true, data: payload.profile });
    }
    catch (error) {
        console.error('Erro ao acessar Pugotiprofile:', error);
        res.status(502).json({
            success: false,
            error: 'Não foi possível acessar o perfil Pugotilab'
        });
    }
}
async function getProfile(req, res) {
    return proxyProfile(req, res, 'GET');
}
async function updateProfile(req, res) {
    const { nickname, avatarUrl, biography, location } = req.body;
    return proxyProfile(req, res, 'PATCH', {
        nickname,
        avatarUrl,
        biography,
        location
    });
}
//# sourceMappingURL=profileController.js.map