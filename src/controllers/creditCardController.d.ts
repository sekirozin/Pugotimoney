import { Request, Response } from 'express';
export declare class CreditCardController {
    getCreditCards(req: Request, res: Response): Promise<void>;
    addCreditCard(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateCreditCard(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteCreditCard(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getCardsSummary(req: Request, res: Response): Promise<void>;
    getUpcomingInvoices(req: Request, res: Response): Promise<void>;
    updateCardBalance(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    importInvoice(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const creditCardController: CreditCardController;
//# sourceMappingURL=creditCardController.d.ts.map