import { Request, Response } from 'express';
declare class IncomeController {
    getIncomes(req: Request, res: Response): Promise<void>;
    addIncome(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateIncome(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteIncome(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const incomeController: IncomeController;
export {};
//# sourceMappingURL=incomeController.d.ts.map