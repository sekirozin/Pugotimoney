import { civilDate, todayCivil } from '../utils/calendar';
import { Request, Response } from 'express';
import { database } from '../models/database';
import { AuthRequest } from '../middleware/auth';

class ExpenseController {
    async getExpenses(req: AuthRequest, res: Response) {
        try {
            const expenses = await database.getExpenses(req.user!.id);
            res.json({ success: true, data: expenses });
        } catch (error) {
            console.error('Erro ao buscar despesas:', error);
            res.status(500).json({ success: false, error: 'Erro ao buscar despesas' });
        }
    }

    async addExpense(req: AuthRequest, res: Response) {
        try {
            const { description, amount, category, date, recurrence = 'specific' } = req.body;
            if (typeof description !== 'string' || !description.trim() || typeof category !== 'string' || !category.trim() || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount*100)) || !civilDate(date)) {
                return res.status(400).json({ success: false, error: 'Preencha todos os campos' });
            }
            if (!['specific', 'monthly', 'yearly'].includes(recurrence)) {
                return res.status(400).json({ success: false, error: 'Recorrência inválida' });
            }
            const id = await database.addExpense({ description, amount, category, date, recurrence }, req.user!.id);
            res.json({ success: true, data: { id } });
        } catch (error) {
            console.error('Erro ao adicionar despesa:', error);
            res.status(500).json({ success: false, error: 'Erro ao adicionar despesa' });
        }
    }

    async updateExpense(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const updates = { ...req.body, recurrence: req.body.recurrence || 'specific' };
            if (typeof updates.description !== 'string' || !updates.description.trim() || typeof updates.category !== 'string' || !updates.category.trim() || typeof updates.amount !== 'number' || !Number.isFinite(updates.amount) || updates.amount <= 0 || !Number.isSafeInteger(Math.round(updates.amount*100)) || !civilDate(updates.date)) { res.status(400).json({success:false,error:'Dados inválidos'}); return; }
            if (!['specific', 'monthly', 'yearly'].includes(updates.recurrence)) {
                return res.status(400).json({ success: false, error: 'Recorrência inválida' });
            }
            const updated = await database.updateExpense(parseInt(id), updates, req.user!.id);
            if (!updated) {
                return res.status(404).json({ success: false, error: 'Despesa não encontrada' });
            }
            res.json({ success: true, message: 'Despesa atualizada com sucesso' });
        } catch (error) {
            console.error('Erro ao atualizar despesa:', error);
            res.status(500).json({ success: false, error: 'Erro ao atualizar despesa' });
        }
    }

    async setCompleted(req: AuthRequest, res: Response) {
        try {
            const id = Number(req.params.id);
            if (!Number.isSafeInteger(id) || id <= 0 || typeof req.body?.completed !== 'boolean') return res.status(400).json({ success: false, error: 'Dados inválidos' });
            const completedAt = req.body.completed ? todayCivil() : null;
            const updated = await database.setExpenseCompleted(id, completedAt, req.user!.id);
            if (!updated) return res.status(404).json({ success: false, error: 'Despesa não encontrada' });
            res.json({ success: true, data: { completed_at: completedAt } });
        } catch (error) {
            console.error('Erro ao concluir despesa:', error);
            res.status(500).json({ success: false, error: 'Erro ao concluir despesa' });
        }
    }

    async deleteExpense(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const deleted = await database.deleteExpense(parseInt(id), req.user!.id);
            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Despesa não encontrada' });
            }
            res.json({ success: true, message: 'Despesa excluída com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir despesa:', error);
            res.status(500).json({ success: false, error: 'Erro ao excluir despesa' });
        }
    }
}

export const expenseController = new ExpenseController();
