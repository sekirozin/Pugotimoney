import { Request, Response } from 'express';
export declare class InstallmentController {
    getInstallments(req: Request, res: Response): Promise<void>;
    addInstallment(req: Request, res: Response): Promise<void>;
    updateInstallment(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteInstallment(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getUpcomingInstallments(req: Request, res: Response): Promise<void>;
    getCompletedInstallments(req: Request, res: Response): Promise<void>;
    markInstallmentAsPaid(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const installmentController: InstallmentController;
//# sourceMappingURL=installmentController.d.ts.map