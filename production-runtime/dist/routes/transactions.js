"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transactionController_1 = require("../controllers/transactionController");
const router = (0, express_1.Router)();
// GET /api/transactions - Obter todas as transações
router.get('/', transactionController_1.transactionController.getTransactions);
// GET /api/transactions/statistics - Obter estatísticas gerais
router.get('/statistics', transactionController_1.transactionController.getStatistics);
// GET /api/transactions/recent - Obter transações recentes
router.get('/recent', transactionController_1.transactionController.getRecentTransactions);
// GET /api/transactions/category-totals - Obter totais por categoria
router.get('/category-totals', transactionController_1.transactionController.getCategoryTotals);
// GET /api/transactions/monthly-summary - Obter resumo mensal
router.get('/monthly-summary', transactionController_1.transactionController.getMonthlySummary);
// POST /api/transactions - Adicionar nova transação
router.post('/', transactionController_1.transactionController.addTransaction);
// PUT /api/transactions/:id - Atualizar transação
router.put('/:id', transactionController_1.transactionController.updateTransaction);
// DELETE /api/transactions/:id - Excluir transação
router.delete('/:id', transactionController_1.transactionController.deleteTransaction);
// GET /api/transactions/:id - Obter transação por ID
router.get('/:id', transactionController_1.transactionController.getTransactionById);
exports.default = router;
//# sourceMappingURL=transactions.js.map