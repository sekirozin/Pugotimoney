import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
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
export declare function getPugotiLabSession(req: Request): PugotiLabSession;
declare class AuthController {
    sso(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    me(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const authController: AuthController;
export {};
//# sourceMappingURL=authController.d.ts.map