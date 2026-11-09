import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class DashboardController {
    getDashboard(req: AuthRequest, res: Response): Promise<void>;
    getFinancialSummary(req: AuthRequest, res: Response): Promise<void>;
    getChartData(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getRecentActivity(req: AuthRequest, res: Response): Promise<void>;
}
export declare const dashboardController: DashboardController;
//# sourceMappingURL=dashboardController.d.ts.map