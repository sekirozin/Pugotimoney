import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
declare class ExpenseController {
    getExpenses(req: AuthRequest, res: Response): Promise<void>;
    addExpense(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateExpense(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    setCompleted(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteExpense(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const expenseController: ExpenseController;
export {};
//# sourceMappingURL=expenseController.d.ts.map