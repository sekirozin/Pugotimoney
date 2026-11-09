"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const budgetController_1 = require("../controllers/budgetController");
const router = (0, express_1.Router)();
// GET /api/budgets - Obter todos os orçamentos
router.get('/', budgetController_1.budgetController.getBudgets);
// GET /api/budgets/status - Obter status dos orçamentos
router.get('/status', budgetController_1.budgetController.getBudgetsStatus);
// GET /api/budgets/alerts - Obter alertas de orçamento
router.get('/alerts', budgetController_1.budgetController.getBudgetAlerts);
// GET /api/budgets/monthly-summary - Obter resumo mensal dos orçamentos
router.get('/monthly-summary', budgetController_1.budgetController.getMonthlyBudgetSummary);
// POST /api/budgets - Adicionar novo orçamento
router.post('/', budgetController_1.budgetController.addBudget);
// PUT /api/budgets/:id - Atualizar orçamento
router.put('/:id', budgetController_1.budgetController.updateBudget);
// DELETE /api/budgets/:id - Excluir orçamento
router.delete('/:id', budgetController_1.budgetController.deleteBudget);
// PATCH /api/budgets/:id/spent - Atualizar valor gasto do orçamento
router.patch('/:id/spent', budgetController_1.budgetController.updateSpentAmount);
exports.default = router;
//# sourceMappingURL=budgets.js.map