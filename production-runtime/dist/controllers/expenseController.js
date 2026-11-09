"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenseController = void 0;
const calendar_1 = require("../utils/calendar");
const database_1 = require("../models/database");
class ExpenseController {
    async getExpenses(req, res) {
        try {
            const expenses = await database_1.database.getExpenses(req.user.id);
            res.json({ success: true, data: expenses });
        }
        catch (error) {
            console.error('Erro ao buscar despesas:', error);
            res.status(500).json({ success: false, error: 'Erro ao buscar despesas' });
        }
    }
    async addExpense(req, res) {
        try {
            const { description, amount, category, date, recurrence = 'specific' } = req.body;
            if (typeof description !== 'string' || !description.trim() || typeof category !== 'string' || !category.trim() || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100)) || !(0, calendar_1.civilDate)(date)) {
                return res.status(400).json({ success: false, error: 'Preencha todos os campos' });
            }
            if (!['specific', 'monthly', 'yearly'].includes(recurrence)) {
                return res.status(400).json({ success: false, error: 'Recorrência inválida' });
            }
            const id = await database_1.database.addExpense({ description, amount, category, date, recurrence }, req.user.id);
            res.json({ success: true, data: { id } });
        }
        catch (error) {
            console.error('Erro ao adicionar despesa:', error);
            res.status(500).json({ success: false, error: 'Erro ao adicionar despesa' });
        }
    }
    async updateExpense(req, res) {
        try {
            const { id } = req.params;
            const updates = { ...req.body, recurrence: req.body.recurrence || 'specific' };
            if (typeof updates.description !== 'string' || !updates.description.trim() || typeof updates.category !== 'string' || !updates.category.trim() || typeof updates.amount !== 'number' || !Number.isFinite(updates.amount) || updates.amount <= 0 || !Number.isSafeInteger(Math.round(updates.amount * 100)) || !(0, calendar_1.civilDate)(updates.date)) {
                res.status(400).json({ success: false, error: 'Dados inválidos' });
                return;
            }
            if (!['specific', 'monthly', 'yearly'].includes(updates.recurrence)) {
                return res.status(400).json({ success: false, error: 'Recorrência inválida' });
            }
            const updated = await database_1.database.updateExpense(parseInt(id), updates, req.user.id);
            if (!updated) {
                return res.status(404).json({ success: false, error: 'Despesa não encontrada' });
            }
            res.json({ success: true, message: 'Despesa atualizada com sucesso' });
        }
        catch (error) {
            console.error('Erro ao atualizar despesa:', error);
            res.status(500).json({ success: false, error: 'Erro ao atualizar despesa' });
        }
    }
    async setCompleted(req, res) {
        try {
            const id = Number(req.params.id);
            if (!Number.isSafeInteger(id) || id <= 0 || typeof req.body?.completed !== 'boolean')
                return res.status(400).json({ success: false, error: 'Dados inválidos' });
            const completedAt = req.body.completed ? (0, calendar_1.todayCivil)() : null;
            const updated = await database_1.database.setExpenseCompleted(id, completedAt, req.user.id);
            if (!updated)
                return res.status(404).json({ success: false, error: 'Despesa não encontrada' });
            res.json({ success: true, data: { completed_at: completedAt } });
        }
        catch (error) {
            console.error('Erro ao concluir despesa:', error);
            res.status(500).json({ success: false, error: 'Erro ao concluir despesa' });
        }
    }
    async deleteExpense(req, res) {
        try {
            const { id } = req.params;
            const deleted = await database_1.database.deleteExpense(parseInt(id), req.user.id);
            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Despesa não encontrada' });
            }
            res.json({ success: true, message: 'Despesa excluída com sucesso' });
        }
        catch (error) {
            console.error('Erro ao excluir despesa:', error);
            res.status(500).json({ success: false, error: 'Erro ao excluir despesa' });
        }
    }
}
exports.expenseController = new ExpenseController();
//# sourceMappingURL=expenseController.js.map