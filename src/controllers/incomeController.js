"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incomeController = void 0;
const express_1 = require("express");
const database_1 = require("../models/database");
class IncomeController {
    async getIncomes(req, res) {
        try {
            const incomes = await database_1.database.getIncomes();
            res.json({ success: true, data: incomes });
        }
        catch (error) {
            console.error('Erro ao buscar receitas:', error);
            res.status(500).json({ success: false, error: 'Erro ao buscar receitas' });
        }
    }
    async addIncome(req, res) {
        try {
            const { description, amount, category, date } = req.body;
            if (!description || !amount || !category || !date) {
                return res.status(400).json({ success: false, error: 'Preencha todos os campos' });
            }
            const id = await database_1.database.addIncome({ description, amount, category, date });
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
            const updates = req.body;
            const updated = await database_1.database.updateIncome(parseInt(id), updates);
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
            const deleted = await database_1.database.deleteIncome(parseInt(id));
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