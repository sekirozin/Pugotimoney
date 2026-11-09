import { Request, Response } from 'express';
import { database } from '../models/database';
import { getFinancialGoalProgress } from '../utils/helpers';
import { AuthRequest } from '../middleware/auth';

// Interpreta "YYYY-MM-DD" como dia civil, sem deslocamento de fuso horário
function parseDateOnly(value: string): Date {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    return new Date(value);
}

export class GoalController {
    // Obter grupos de assinaturas
    async getSubscriptionGroups(req: AuthRequest, res: Response) {
        try {
            const groups = await database.getSubscriptionGroups(req.user!.id);
            res.json({ success: true, data: groups, total: groups.length });
        } catch (error) {
            console.error('Erro ao buscar grupos de assinaturas:', error);
            res.status(500).json({ success: false, error: 'Erro ao buscar grupos de assinaturas' });
        }
    }

    // Adicionar grupo de assinaturas
    async addSubscriptionGroup(req: AuthRequest, res: Response) {
        try {
            const groupData = req.body;
            const name = String(groupData.name ?? '').trim();

            if (!name) {
                return res.status(400).json({ success: false, error: 'Nome do grupo é obrigatório' });
            }

            const groupId = await database.addSubscriptionGroup({
                name,
                description: groupData.description ?? null
            }, req.user!.id);

            res.status(201).json({
                success: true,
                data: { id: groupId, name, description: groupData.description ?? null },
                message: 'Grupo de assinaturas adicionado com sucesso'
            });
        } catch (error: any) {
            console.error('Erro ao adicionar grupo de assinaturas:', error);
            res.status(500).json({ success: false, error: error?.code === 'SQLITE_CONSTRAINT' ? 'Já existe um grupo com esse nome' : 'Erro ao adicionar grupo de assinaturas' });
        }
    }

    // Atualizar grupo de assinaturas
    async updateSubscriptionGroup(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const groupData = req.body;
            const name = String(groupData.name ?? '').trim();

            if (!name) {
                return res.status(400).json({ success: false, error: 'Nome do grupo é obrigatório' });
            }

            const updated = await database.updateSubscriptionGroup(parseInt(id), {
                name,
                description: groupData.description ?? null
            }, req.user!.id);

            if (!updated) {
                return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
            }

            res.json({ success: true, message: 'Grupo de assinaturas atualizado com sucesso' });
        } catch (error: any) {
            console.error('Erro ao atualizar grupo de assinaturas:', error);
            res.status(500).json({ success: false, error: error?.code === 'SQLITE_CONSTRAINT' ? 'Já existe um grupo com esse nome' : 'Erro ao atualizar grupo de assinaturas' });
        }
    }

    // Excluir grupo de assinaturas
    async deleteSubscriptionGroup(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const deleted = await database.deleteSubscriptionGroup(parseInt(id), req.user!.id);

            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
            }

            res.json({ success: true, message: 'Grupo excluído; assinaturas foram movidas para Sem grupo' });
        } catch (error) {
            console.error('Erro ao excluir grupo de assinaturas:', error);
            res.status(500).json({ success: false, error: 'Erro ao excluir grupo de assinaturas' });
        }
    }

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

            // Mês-alvo: data informada (para meses passados/futuros) ou mês atual
            const requestedDate = typeof req.body?.date === 'string' ? req.body.date : '';
            const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate);
            const targetDate = isValidDate ? new Date(requestedDate + 'T12:00:00') : new Date();
            const targetYear = targetDate.getFullYear();
            const targetMonth = targetDate.getMonth();

            // Respeitar a vigência da assinatura
            if (goal.startDate) {
                const start = parseDateOnly(goal.startDate);
                if (!Number.isNaN(start.getTime()) && (start.getFullYear() * 12 + start.getMonth()) > targetYear * 12 + targetMonth) {
                    return res.status(400).json({ success: false, error: 'Esta assinatura ainda não estava ativa neste mês' });
                }
            }
            if (goal.endDate) {
                const end = parseDateOnly(goal.endDate);
                if (!Number.isNaN(end.getTime()) && (end.getFullYear() * 12 + end.getMonth()) < targetYear * 12 + targetMonth) {
                    return res.status(400).json({ success: false, error: 'Esta assinatura foi cancelada antes deste mês' });
                }
            }

            // Verificar se já foi paga no mês alvo
            const transactions = await database.getTransactions(undefined, req.user!.id);

            const alreadyPaid = transactions.some(t => {
                const d = new Date(t.date);
                return t.description === goal.name + ' (Assinatura)'
                    && d.getMonth() === targetMonth
                    && d.getFullYear() === targetYear;
            });

            if (alreadyPaid) {
                return res.status(400).json({
                    success: false,
                    error: 'Esta assinatura já foi paga neste mês'
                });
            }

            // Respeitar o dia de pagamento dentro do mês alvo quando possível
            let transactionDay = targetDate.getDate();
            if (isValidDate && goal.paymentDay) {
                const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
                transactionDay = Math.min(Number(goal.paymentDay), daysInTargetMonth);
            }
            const transaction = {
                type: 'expense',
                amount: goal.targetAmount,
                category: goal.category || 'assinaturas',
                description: goal.name + ' (Assinatura)',
                date: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(transactionDay).padStart(2, '0')}T12:00:00`,
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
