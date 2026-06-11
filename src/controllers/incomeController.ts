import { Request, Response } from 'express';
import { database } from '../models/database';
import { AuthRequest } from '../middleware/auth';

class IncomeController {
    async getIncomes(req: AuthRequest, res: Response) {
        try {
            const incomes = await database.getIncomes(req.user!.id);
            res.json({ success: true, data: incomes });
        } catch (error) {
            console.error('Erro ao buscar receitas:', error);
            res.status(500).json({ success: false, error: 'Erro ao buscar receitas' });
        }
    }

    async addIncome(req: AuthRequest, res: Response) {
        try {
            const { description, amount, category, date } = req.body;
            if (!description || !amount || !category || !date) {
                return res.status(400).json({ success: false, error: 'Preencha todos os campos' });
            }
            const id = await database.addIncome({ description, amount, category, date }, req.user!.id);
            res.json({ success: true, data: { id } });
        } catch (error) {
            console.error('Erro ao adicionar receita:', error);
            res.status(500).json({ success: false, error: 'Erro ao adicionar receita' });
        }
    }

    async updateIncome(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const updated = await database.updateIncome(parseInt(id), updates, req.user!.id);
            if (!updated) {
                return res.status(404).json({ success: false, error: 'Receita não encontrada' });
            }
            res.json({ success: true, message: 'Receita atualizada com sucesso' });
        } catch (error) {
            console.error('Erro ao atualizar receita:', error);
            res.status(500).json({ success: false, error: 'Erro ao atualizar receita' });
        }
    }

    async deleteIncome(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const deleted = await database.deleteIncome(parseInt(id), req.user!.id);
            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Receita não encontrada' });
            }
            res.json({ success: true, message: 'Receita excluída com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir receita:', error);
            res.status(500).json({ success: false, error: 'Erro ao excluir receita' });
        }
    }
}

export const incomeController = new IncomeController();
