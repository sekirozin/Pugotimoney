import { Request, Response } from 'express';
export declare class ShoppingController {
    getShoppingItems(req: Request, res: Response): Promise<void>;
    addShoppingItem(req: Request, res: Response): Promise<void>;
    updateShoppingItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteShoppingItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    togglePurchased(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getActiveItems(req: Request, res: Response): Promise<void>;
    getPurchasedItems(req: Request, res: Response): Promise<void>;
    getTotalEstimated(req: Request, res: Response): Promise<void>;
    clearPurchased(req: Request, res: Response): Promise<void>;
}
export declare const shoppingController: ShoppingController;
//# sourceMappingURL=shoppingController.d.ts.map