import { Request, Response } from 'express';
export declare class DashboardController {
    getDashboard(req: Request, res: Response): Promise<void>;
    getFinancialSummary(req: Request, res: Response): Promise<void>;
    getChartData(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getRecentActivity(req: Request, res: Response): Promise<void>;
}
export declare const dashboardController: DashboardController;
//# sourceMappingURL=dashboardController.d.ts.map