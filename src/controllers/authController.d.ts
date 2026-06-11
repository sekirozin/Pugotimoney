import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
declare class AuthController {
    register(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    login(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    me(req: AuthRequest, res: Response): Promise<void>;
    checkFirstUser(req: Request, res: Response): Promise<void>;
}
export declare const authController: AuthController;
export {};
//# sourceMappingURL=authController.d.ts.map