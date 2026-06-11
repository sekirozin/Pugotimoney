import { Router } from 'express';
import { goalController } from '../controllers/goalController';

const router = Router();

// GET /api/goals - Obter todas as metas financeiras
router.get('/', goalController.getGoals);

// GET /api/goals/summary - Obter resumo geral das metas
router.get('/summary', goalController.getGoalsSummary);

// GET /api/goals/near-completion - Obter metas próximas de serem alcançadas
router.get('/near-completion', goalController.getNearCompletionGoals);

// GET /api/goals/completed - Obter metas concluídas
router.get('/completed', goalController.getCompletedGoals);

// POST /api/goals - Adicionar nova meta financeira
router.post('/', goalController.addGoal);

// PUT /api/goals/:id - Atualizar meta financeira
router.put('/:id', goalController.updateGoal);

// DELETE /api/goals/:id - Excluir meta financeira
router.delete('/:id', goalController.deleteGoal);

// PATCH /api/goals/:id/current-amount - Atualizar valor atual da meta
router.patch('/:id/current-amount', goalController.updateCurrentAmount);

// POST /api/goals/:id/mark-paid - Marcar assinatura como paga
router.post('/:id/mark-paid', goalController.markAsPaid);

export default router;