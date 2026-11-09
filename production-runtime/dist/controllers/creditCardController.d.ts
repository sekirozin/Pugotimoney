import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class CreditCardController {
    getCreditCards(req: AuthRequest, res: Response): Promise<void>;
    addCreditCard(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateCreditCard(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteCreditCard(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getCardsSummary(req: AuthRequest, res: Response): Promise<void>;
    getUpcomingInvoices(req: AuthRequest, res: Response): Promise<void>;
    updateCardBalance(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    importInvoice(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const creditCardController: CreditCardController;
//# sourceMappingURL=creditCardController.d.ts.map