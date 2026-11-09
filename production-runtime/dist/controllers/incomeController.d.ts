import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
declare class IncomeController {
    getIncomes(req: AuthRequest, res: Response): Promise<void>;
    addIncome(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateIncome(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteIncome(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const incomeController: IncomeController;
export {};
//# sourceMappingURL=incomeController.d.ts.map