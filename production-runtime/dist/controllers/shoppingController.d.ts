import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ShoppingController {
    reorderShoppingItems(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getShoppingItems(req: AuthRequest, res: Response): Promise<void>;
    addShoppingItem(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateShoppingItem(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteShoppingItem(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    togglePurchased(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getActiveItems(req: AuthRequest, res: Response): Promise<void>;
    getPurchasedItems(req: AuthRequest, res: Response): Promise<void>;
    getTotalEstimated(req: AuthRequest, res: Response): Promise<void>;
    clearPurchased(req: AuthRequest, res: Response): Promise<void>;
}
export declare const shoppingController: ShoppingController;
//# sourceMappingURL=shoppingController.d.ts.map