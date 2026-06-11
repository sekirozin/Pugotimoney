import { Router } from 'express';
import { transactionController } from '../controllers/transactionController';

const router = Router();

// GET /api/transactions - Obter todas as transações
router.get('/', transactionController.getTransactions);

// GET /api/transactions/statistics - Obter estatísticas gerais
router.get('/statistics', transactionController.getStatistics);

// GET /api/transactions/recent - Obter transações recentes
router.get('/recent', transactionController.getRecentTransactions);

// GET /api/transactions/category-totals - Obter totais por categoria
router.get('/category-totals', transactionController.getCategoryTotals);

// GET /api/transactions/monthly-summary - Obter resumo mensal
router.get('/monthly-summary', transactionController.getMonthlySummary);

// POST /api/transactions - Adicionar nova transação
router.post('/', transactionController.addTransaction);

// PUT /api/transactions/:id - Atualizar transação
router.put('/:id', transactionController.updateTransaction);

// DELETE /api/transactions/:id - Excluir transação
router.delete('/:id', transactionController.deleteTransaction);

// GET /api/transactions/:id - Obter transação por ID
router.get('/:id', transactionController.getTransactionById);

export default router;
