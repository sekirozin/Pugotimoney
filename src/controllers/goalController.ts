import { Request, Response } from 'express';
import { database } from '../models/database';
import { getFinancialGoalProgress } from '../utils/helpers';
import { AuthRequest } from '../middleware/auth';

export class GoalController {
    // Obter todas as metas financeiras
    async getGoals(req: AuthRequest, res: Response) {
        try {
            const goals = await database.getFinancialGoals(req.user!.id);
            
            // Adicionar progresso detalhado a cada meta
            const goalsWithProgress = goals.map(goal => ({
                ...goal,
                progress: getFinancialGoalProgress(goal)
            }));
            
            res.json({
                success: true,
                data: goalsWithProgress,
                total: goals.length
            });
        } catch (error) {
            console.error('Erro ao buscar metas financeiras:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar metas financeiras'
            });
        }
    }

    // Adicionar nova meta financeira
    async addGoal(req: AuthRequest, res: Response) {
        try {
            const goalData = req.body;
            
            const goalId = await database.addFinancialGoal(goalData, req.user!.id);
            
            res.status(201).json({
                success: true,
                data: { id: goalId, ...goalData },
                message: 'Meta financeira adicionada com sucesso'
            });
        } catch (error) {
            console.error('Erro ao adicionar meta financeira:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao adicionar meta financeira'
            });
        }
    }

    // Atualizar meta financeira
    async updateGoal(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const updates = req.body;
            
            const updated = await database.updateFinancialGoal(parseInt(id), updates, req.user!.id);
            
            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: 'Meta não encontrada'
                });
            }

            res.json({
                success: true,
                message: 'Meta financeira atualizada com sucesso'
            });
        } catch (error) {
            console.error('Erro ao atualizar meta financeira:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar meta financeira'
            });
        }
    }

    // Excluir meta financeira
    async deleteGoal(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            
            const deleted = await database.deleteFinancialGoal(parseInt(id), req.user!.id);
            
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Meta não encontrada'
                });
            }

            res.json({
                success: true,
                message: 'Meta financeira excluída com sucesso'
            });
        } catch (error) {
            console.error('Erro ao excluir meta financeira:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao excluir meta financeira'
            });
        }
    }

    // Marcar assinatura como paga (cria transação)
    async markAsPaid(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const goals = await database.getFinancialGoals(req.user!.id);
            const goal = goals.find(g => g.id === parseInt(id));

            if (!goal) {
                return res.status(404).json({
                    success: false,
                    error: 'Assinatura não encontrada'
                });
            }

            // Verificar se já foi paga este mês
            const transactions = await database.getTransactions(undefined, req.user!.id);
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const alreadyPaid = transactions.some(t => {
                const d = new Date(t.date);
                return t.description === goal.name + ' (Assinatura)'
                    && d.getMonth() === currentMonth
                    && d.getFullYear() === currentYear;
            });

            if (alreadyPaid) {
                return res.status(400).json({
                    success: false,
                    error: 'Esta assinatura já foi paga este mês'
                });
            }

            const transaction = {
                type: 'expense',
                amount: goal.targetAmount,
                category: goal.category || 'assinaturas',
                description: goal.name + ' (Assinatura)',
                date: now.toISOString().split('T')[0] + 'T12:00:00',
                payment_method: 'debito'
            };

            const transactionId = await database.addTransaction(transaction, req.user!.id);

            res.json({
                success: true,
                message: 'Assinatura marcada como paga',
                data: { transactionId }
            });
        } catch (error) {
            console.error('Erro ao marcar assinatura como paga:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao marcar assinatura como paga'
            });
        }
    }

    // Atualizar valor atual da meta
    async updateCurrentAmount(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { amount } = req.body;
            
            if (typeof amount !== 'number' || amount < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valor inválido. Deve ser um número positivo.'
                });
            }

            // Buscar meta atual
            const goals = await database.getFinancialGoals(req.user!.id);
            const goal = goals.find(g => g.id === parseInt(id));
            
            if (!goal) {
                return res.status(404).json({
                    success: false,
                    error: 'Meta não encontrada'
                });
            }

            const updated = await database.updateFinancialGoal(parseInt(id), {
                currentAmount: amount
            }, req.user!.id);
            
            if (!updated) {
                return res.status(400).json({
                    success: false,
                    error: 'Erro ao atualizar valor atual'
                });
            }

            res.json({
                success: true,
                message: 'Valor atual atualizado com sucesso',
                data: {
                    goalId: parseInt(id),
                    newAmount: amount,
                    progress: getFinancialGoalProgress({ ...goal, currentAmount: amount })
                }
            });
        } catch (error) {
            console.error('Erro ao atualizar valor atual da meta:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar valor atual da meta'
            });
        }
    }

    // Obter metas próximas de serem alcançadas
    async getNearCompletionGoals(req: AuthRequest, res: Response) {
        try {
            const goals = await database.getFinancialGoals(req.user!.id);
            const nearCompletion = goals
                .map(goal => ({
                    ...goal,
                    progress: getFinancialGoalProgress(goal)
                }))
                .filter(goal => goal.progress.percentage >= 90 && goal.progress.percentage < 100)
                .sort((a, b) => b.progress.percentage - a.progress.percentage);

            res.json({
                success: true,
                data: {
                    totalNearCompletion: nearCompletion.length,
                    goals: nearCompletion
                }
            });
        } catch (error) {
            console.error('Erro ao buscar metas próximas de conclusão:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar metas próximas de conclusão'
            });
        }
    }

    // Obter metas concluídas
    async getCompletedGoals(req: AuthRequest, res: Response) {
        try {
            const goals = await database.getFinancialGoals(req.user!.id);
            const completed = goals
                .map(goal => ({
                    ...goal,
                    progress: getFinancialGoalProgress(goal)
                }))
                .filter(goal => goal.progress.isCompleted);

            res.json({
                success: true,
                data: {
                    totalCompleted: completed.length,
                    totalAmount: completed.reduce((sum, goal) => sum + goal.targetAmount, 0),
                    goals: completed
                }
            });
        } catch (error) {
            console.error('Erro ao buscar metas concluídas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar metas concluídas'
            });
        }
    }

    // Obter resumo geral das metas
    async getGoalsSummary(req: AuthRequest, res: Response) {
        try {
            const goals = await database.getFinancialGoals(req.user!.id);
            
            const totalGoals = goals.length;
            const completedGoals = goals.filter(goal => {
                const progress = getFinancialGoalProgress(goal);
                return progress.isCompleted;
            }).length;
            
            const inProgressGoals = totalGoals - completedGoals;
            const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
            const totalCurrentAmount = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
            const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

            const byCategory: Record<string, { count: number; target: number; current: number }> = {};
            goals.forEach(goal => {
                if (!byCategory[goal.category || 'outros']) {
                    byCategory[goal.category || 'outros'] = { count: 0, target: 0, current: 0 };
                }
                byCategory[goal.category || 'outros'].count++;
                byCategory[goal.category || 'outros'].target += goal.targetAmount;
                byCategory[goal.category || 'outros'].current += goal.currentAmount;
            });

            res.json({
                success: true,
                data: {
                    totalGoals,
                    completedGoals,
                    inProgressGoals,
                    totalTargetAmount,
                    totalCurrentAmount,
                    overallProgress,
                    byCategory,
                    averageProgress: totalGoals > 0 ? goals.reduce((sum, goal) => {
                        const progress = getFinancialGoalProgress(goal);
                        return sum + progress.percentage;
                    }, 0) / totalGoals : 0
                }
            });
        } catch (error) {
            console.error('Erro ao buscar resumo das metas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar resumo das metas'
            });
        }
    }
}

export const goalController = new GoalController();
