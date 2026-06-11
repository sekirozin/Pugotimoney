import { Router } from 'express';
import { budgetController } from '../controllers/budgetController';

const router = Router();

// GET /api/budgets - Obter todos os orçamentos
router.get('/', budgetController.getBudgets);

// GET /api/budgets/status - Obter status dos orçamentos
router.get('/status', budgetController.getBudgetsStatus);

// GET /api/budgets/alerts - Obter alertas de orçamento
router.get('/alerts', budgetController.getBudgetAlerts);

// GET /api/budgets/monthly-summary - Obter resumo mensal dos orçamentos
router.get('/monthly-summary', budgetController.getMonthlyBudgetSummary);

// POST /api/budgets - Adicionar novo orçamento
router.post('/', budgetController.addBudget);

// PUT /api/budgets/:id - Atualizar orçamento
router.put('/:id', budgetController.updateBudget);

// DELETE /api/budgets/:id - Excluir orçamento
router.delete('/:id', budgetController.deleteBudget);

// PATCH /api/budgets/:id/spent - Atualizar valor gasto do orçamento
router.patch('/:id/spent', budgetController.updateSpentAmount);

export default router;