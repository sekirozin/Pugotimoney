import { Request, Response } from 'express';
export declare class GoalController {
    getGoals(req: Request, res: Response): Promise<void>;
    addGoal(req: Request, res: Response): Promise<void>;
    updateGoal(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteGoal(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateCurrentAmount(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getNearCompletionGoals(req: Request, res: Response): Promise<void>;
    getCompletedGoals(req: Request, res: Response): Promise<void>;
    getGoalsSummary(req: Request, res: Response): Promise<void>;
}
export declare const goalController: GoalController;
//# sourceMappingURL=goalController.d.ts.map