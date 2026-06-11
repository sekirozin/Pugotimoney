"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const goalController_1 = require("../controllers/goalController");
const router = (0, express_1.Router)();
// GET /api/goals - Obter todas as metas financeiras
router.get('/', goalController_1.goalController.getGoals);
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
exports.default = router;
//# sourceMappingURL=goals.js.map