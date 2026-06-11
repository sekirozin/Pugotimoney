import { Request, Response } from 'express';
export declare class BudgetController {
    getBudgets(req: Request, res: Response): Promise<void>;
    addBudget(req: Request, res: Response): Promise<void>;
    updateBudget(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteBudget(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateSpentAmount(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getBudgetsStatus(req: Request, res: Response): Promise<void>;
    getBudgetAlerts(req: Request, res: Response): Promise<void>;
    getMonthlyBudgetSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const budgetController: BudgetController;
//# sourceMappingURL=budgetController.d.ts.map