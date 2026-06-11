import { Request, Response } from 'express';
export declare class TransactionController {
    getTransactions(req: Request, res: Response): Promise<void>;
    getTransactionById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    addTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getMonthlySummary(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getCategoryTotals(req: Request, res: Response): Promise<void>;
    getRecentTransactions(req: Request, res: Response): Promise<void>;
    getStatistics(req: Request, res: Response): Promise<void>;
}
export declare const transactionController: TransactionController;
//# sourceMappingURL=transactionController.d.ts.map