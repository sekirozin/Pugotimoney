import { Request, Response } from 'express';
export declare class CategoryController {
    getCategories(req: Request, res: Response): Promise<void>;
    addCategory(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getCategoriesByType(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getCategoriesWithUsage(req: Request, res: Response): Promise<void>;
    getTopCategories(req: Request, res: Response): Promise<void>;
    updateCategory(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteCategory(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getCategoryStatistics(req: Request, res: Response): Promise<void>;
}
export declare const categoryController: CategoryController;
//# sourceMappingURL=categoryController.d.ts.map