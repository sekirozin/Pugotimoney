"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incomeController = void 0;
const calendar_1 = require("../utils/calendar");
const database_1 = require("../models/database");
class IncomeController {
    async getIncomes(req, res) {
        try {
            const incomes = await database_1.database.getIncomes(req.user.id);
            res.json({ success: true, data: incomes });
        }
        catch (error) {
            console.error('Erro ao buscar receitas:', error);
            res.status(500).json({ success: false, error: 'Erro ao buscar receitas' });
        }
    }
    async addIncome(req, res) {
        try {
            const { description, amount, category, date, recurrence = 'specific' } = req.body;
            if (typeof description !== 'string' || !description.trim() || typeof category !== 'string' || !category.trim() || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100)) || !(0, calendar_1.civilDate)(date)) {
                return res.status(400).json({ success: false, error: 'Preencha todos os campos' });
            }
            if (!['specific', 'monthly', 'yearly'].includes(recurrence)) {
                return res.status(400).json({ success: false, error: 'Recorrência inválida' });
            }
            const id = await database_1.database.addIncome({ description, amount, category, date, recurrence }, req.user.id);
            res.json({ success: true, data: { id } });
        }
        catch (error) {
            console.error('Erro ao adicionar receita:', error);
            res.status(500).json({ success: false, error: 'Erro ao adicionar receita' });
        }
    }
    async updateIncome(req, res) {
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
            const updated = await database_1.database.updateIncome(parseInt(id), updates, req.user.id);
            if (!updated) {
                return res.status(404).json({ success: false, error: 'Receita não encontrada' });
            }
            res.json({ success: true, message: 'Receita atualizada com sucesso' });
        }
        catch (error) {
            console.error('Erro ao atualizar receita:', error);
            res.status(500).json({ success: false, error: 'Erro ao atualizar receita' });
        }
    }
    async deleteIncome(req, res) {
        try {
            const { id } = req.params;
            const deleted = await database_1.database.deleteIncome(parseInt(id), req.user.id);
            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Receita não encontrada' });
            }
            res.json({ success: true, message: 'Receita excluída com sucesso' });
        }
        catch (error) {
            console.error('Erro ao excluir receita:', error);
            res.status(500).json({ success: false, error: 'Erro ao excluir receita' });
        }
    }
}
exports.incomeController = new IncomeController();
//# sourceMappingURL=incomeController.js.map