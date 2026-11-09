"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const creditCardController_1 = require("../controllers/creditCardController");
const statementService_1 = require("../services/statementService");
const router = (0, express_1.Router)();
const invoiceUploadHandler = (req, res, next) => {
    (0, statementService_1.uploadMiddleware)(req, res, (error) => {
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
router.get('/', creditCardController_1.creditCardController.getCreditCards);
// GET /api/credit-cards/summary - Obter resumo dos cartões
router.get('/summary', creditCardController_1.creditCardController.getCardsSummary);
// GET /api/credit-cards/upcoming-invoices - Obter faturas próximas de vencer
router.get('/upcoming-invoices', creditCardController_1.creditCardController.getUpcomingInvoices);
// POST /api/credit-cards - Adicionar novo cartão de crédito
router.post('/', creditCardController_1.creditCardController.addCreditCard);
// POST /api/credit-cards/:id/import-invoice - Importar fatura do cartão
router.post('/:id/import-invoice', invoiceUploadHandler, creditCardController_1.creditCardController.importInvoice);
// PUT /api/credit-cards/:id - Atualizar cartão de crédito
router.put('/:id', creditCardController_1.creditCardController.updateCreditCard);
// DELETE /api/credit-cards/:id - Excluir cartão de crédito
router.delete('/:id', creditCardController_1.creditCardController.deleteCreditCard);
// PATCH /api/credit-cards/:id/balance - Atualizar saldo do cartão
router.patch('/:id/balance', creditCardController_1.creditCardController.updateCardBalance);
exports.default = router;
//# sourceMappingURL=creditCards.js.map