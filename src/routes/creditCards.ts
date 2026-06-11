import { Router } from 'express';
import { creditCardController } from '../controllers/creditCardController';
import { uploadMiddleware } from '../services/statementService';

const router = Router();

const invoiceUploadHandler = (req: any, res: any, next: any) => {
    uploadMiddleware(req, res, (error: unknown) => {
        if (error) {
            return res.status(400).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro ao receber arquivo'
            });
        }
        next();
    });
};

// GET /api/credit-cards - Obter todos os cartões de crédito
router.get('/', creditCardController.getCreditCards);

// GET /api/credit-cards/summary - Obter resumo dos cartões
router.get('/summary', creditCardController.getCardsSummary);

// GET /api/credit-cards/upcoming-invoices - Obter faturas próximas de vencer
router.get('/upcoming-invoices', creditCardController.getUpcomingInvoices);

// POST /api/credit-cards - Adicionar novo cartão de crédito
router.post('/', creditCardController.addCreditCard);

// POST /api/credit-cards/:id/import-invoice - Importar fatura do cartão
router.post('/:id/import-invoice', invoiceUploadHandler, creditCardController.importInvoice);

// PUT /api/credit-cards/:id - Atualizar cartão de crédito
router.put('/:id', creditCardController.updateCreditCard);

// DELETE /api/credit-cards/:id - Excluir cartão de crédito
router.delete('/:id', creditCardController.deleteCreditCard);

// PATCH /api/credit-cards/:id/balance - Atualizar saldo do cartão
router.patch('/:id/balance', creditCardController.updateCardBalance);

export default router;
