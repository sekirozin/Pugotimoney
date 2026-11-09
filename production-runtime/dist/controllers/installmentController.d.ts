import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class InstallmentController {
    getInstallmentGroups(req: AuthRequest, res: Response): Promise<void>;
    addInstallmentGroup(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateInstallmentGroup(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteInstallmentGroup(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getInstallments(req: AuthRequest, res: Response): Promise<void>;
    addInstallment(req: AuthRequest, res: Response): Promise<void>;
    updateInstallment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteInstallment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getUpcomingInstallments(req: AuthRequest, res: Response): Promise<void>;
    getCompletedInstallments(req: AuthRequest, res: Response): Promise<void>;
    markInstallmentAsPaid(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const installmentController: InstallmentController;
//# sourceMappingURL=installmentController.d.ts.map