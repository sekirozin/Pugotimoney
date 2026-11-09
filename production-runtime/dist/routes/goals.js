"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const goalController_1 = require("../controllers/goalController");
const router = (0, express_1.Router)();
// GET /api/goals - Obter todas as metas financeiras
router.get('/', goalController_1.goalController.getGoals);
// GET /api/goals/groups - Obter grupos de assinaturas
router.get('/groups', goalController_1.goalController.getSubscriptionGroups);
// POST /api/goals/groups - Adicionar grupo de assinaturas
router.post('/groups', goalController_1.goalController.addSubscriptionGroup);
// PUT /api/goals/groups/:id - Atualizar grupo de assinaturas
router.put('/groups/:id', goalController_1.goalController.updateSubscriptionGroup);
// DELETE /api/goals/groups/:id - Excluir grupo de assinaturas
router.delete('/groups/:id', goalController_1.goalController.deleteSubscriptionGroup);
// GET /api/goals/summary - Obter resumo geral das metas
router.get('/summary', goalController_1.goalController.getGoalsSummary);
// GET /api/goals/near-completion - Obter metas próximas de serem alcançadas
router.get('/near-completion', goalController_1.goalController.getNearCompletionGoals);
// GET /api/goals/completed - Obter metas concluídas
router.get('/completed', goalController_1.goalController.getCompletedGoals);
// POST /api/goals - Adicionar nova meta financeira
router.post('/', goalController_1.goalController.addGoal);
// PUT /api/goals/:id - Atualizar meta financeira
router.put('/:id', goalController_1.goalController.updateGoal);
// DELETE /api/goals/:id - Excluir meta financeira
router.delete('/:id', goalController_1.goalController.deleteGoal);
// PATCH /api/goals/:id/current-amount - Atualizar valor atual da meta
router.patch('/:id/current-amount', goalController_1.goalController.updateCurrentAmount);
// POST /api/goals/:id/mark-paid - Marcar assinatura como paga
router.post('/:id/mark-paid', goalController_1.goalController.markAsPaid);
exports.default = router;
//# sourceMappingURL=goals.js.map