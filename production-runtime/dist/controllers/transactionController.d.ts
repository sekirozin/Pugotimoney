import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class TransactionController {
    getTransactions(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getTransactionById(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    addTransaction(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateTransaction(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteTransaction(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getMonthlySummary(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getCategoryTotals(req: AuthRequest, res: Response): Promise<void>;
    getRecentTransactions(req: AuthRequest, res: Response): Promise<void>;
    getStatistics(req: AuthRequest, res: Response): Promise<void>;
}
export declare const transactionController: TransactionController;
//# sourceMappingURL=transactionController.d.ts.map