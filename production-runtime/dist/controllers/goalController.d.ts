import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class GoalController {
    getSubscriptionGroups(req: AuthRequest, res: Response): Promise<void>;
    addSubscriptionGroup(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateSubscriptionGroup(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteSubscriptionGroup(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getGoals(req: AuthRequest, res: Response): Promise<void>;
    addGoal(req: AuthRequest, res: Response): Promise<void>;
    updateGoal(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteGoal(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    markAsPaid(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateCurrentAmount(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getNearCompletionGoals(req: AuthRequest, res: Response): Promise<void>;
    getCompletedGoals(req: AuthRequest, res: Response): Promise<void>;
    getGoalsSummary(req: AuthRequest, res: Response): Promise<void>;
}
export declare const goalController: GoalController;
//# sourceMappingURL=goalController.d.ts.map