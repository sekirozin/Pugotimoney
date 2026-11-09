import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class BudgetController {
    getBudgets(req: AuthRequest, res: Response): Promise<void>;
    addBudget(req: AuthRequest, res: Response): Promise<void>;
    updateBudget(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteBudget(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateSpentAmount(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getBudgetsStatus(req: AuthRequest, res: Response): Promise<void>;
    getBudgetAlerts(req: AuthRequest, res: Response): Promise<void>;
    getMonthlyBudgetSummary(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const budgetController: BudgetController;
//# sourceMappingURL=budgetController.d.ts.map