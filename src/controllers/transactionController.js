"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionController = exports.TransactionController = void 0;
const express_1 = require("express");
const database_1 = require("../models/database");
const types_1 = require("../models/types");
const helpers_1 = require("../utils/helpers");
class TransactionController {
    // Obter todas as transações
    async getTransactions(req, res) {
        try {
            const { type, category, startDate, endDate, minAmount, maxAmount } = req.query;
            const filters = {};
            if (type)
                filters.type = type;
            if (category)
                filters.category = category;
            if (startDate)
                filters.startDate = startDate;
            if (endDate)
                filters.endDate = endDate;
            if (minAmount)
                filters.minAmount = parseFloat(minAmount);
            if (maxAmount)
                filters.maxAmount = parseFloat(maxAmount);
            const transactions = await database_1.database.getTransactions(filters);
            res.json({
                success: true,
                data: transactions,
                total: transactions.length
            });
        }
        catch (error) {
            console.error('Erro ao buscar transações:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar transações'
            });
        }
    }
    // Obter transação por ID
    async getTransactionById(req, res) {
        try {
            const { id } = req.params;
            const transaction = await database_1.database.getTransactions({ id: parseInt(id) });
            if (!transaction || transaction.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Transação não encontrada'
                });
            }
            res.json({
                success: true,
                data: transaction[0]
            });
        }
        catch (error) {
            console.error('Erro ao buscar transação:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar transação'
            });
        }
    }
    // Adicionar nova transação
    async addTransaction(req, res) {
        try {
            const transactionData = req.body;
            // Validar dados
            const validation = (0, helpers_1.validateTransaction)(transactionData);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Dados inválidos',
                    errors: validation.errors
                });
            }
            const transactionId = await database_1.database.addTransaction(transactionData);
            res.status(201).json({
                success: true,
                data: {
                    id: transactionId,
                    ...transactionData
                },
                message: 'Transação adicionada com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao adicionar transação:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao adicionar transação'
            });
        }
    }
    // Atualizar transação
    async updateTransaction(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            // Validar dados
            const validation = (0, helpers_1.validateTransaction)(updates);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Dados inválidos',
                    errors: validation.errors
                });
            }
            const updated = await database_1.database.updateTransaction(parseInt(id), updates);
            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: 'Transação não encontrada'
                });
            }
            res.json({
                success: true,
                message: 'Transação atualizada com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao atualizar transação:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar transação'
            });
        }
    }
    // Excluir transação
    async deleteTransaction(req, res) {
        try {
            const { id } = req.params;
            const deleted = await database_1.database.deleteTransaction(parseInt(id));
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Transação não encontrada'
                });
            }
            res.json({
                success: true,
                message: 'Transação excluída com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao excluir transação:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao excluir transação'
            });
        }
    }
    // Obter resumo mensal
    async getMonthlySummary(req, res) {
        try {
            const { year, month } = req.query;
            if (!year || !month) {
                return res.status(400).json({
                    success: false,
                    error: 'Ano e mês são obrigatórios'
                });
            }
            const summary = await database_1.database.getMonthlySummary(parseInt(year), parseInt(month));
            res.json({
                success: true,
                data: summary
            });
        }
        catch (error) {
            console.error('Erro ao buscar resumo mensal:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar resumo mensal'
            });
        }
    }
    // Obter totais por categoria
    async getCategoryTotals(req, res) {
        try {
            const { type } = req.query;
            const totals = await database_1.database.getCategoryTotals(type);
            res.json({
                success: true,
                data: totals
            });
        }
        catch (error) {
            console.error('Erro ao buscar totais por categoria:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar totais por categoria'
            });
        }
    }
    // Obter transações recentes
    async getRecentTransactions(req, res) {
        try {
            const { limit } = req.query;
            const limitNum = limit ? parseInt(limit) : 10;
            const transactions = await database_1.database.getTransactions();
            const recent = transactions
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, limitNum);
            res.json({
                success: true,
                data: recent,
                total: recent.length
            });
        }
        catch (error) {
            console.error('Erro ao buscar transações recentes:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar transações recentes'
            });
        }
    }
    // Obter estatísticas gerais
    async getStatistics(req, res) {
        try {
            const transactions = await database_1.database.getTransactions();
            // Calcular estatísticas
            const totalIncome = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            const totalExpenses = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            const totalTransactions = transactions.length;
            const averageTransaction = transactions.reduce((sum, t) => sum + t.amount, 0) / totalTransactions || 0;
            const categoryCount = transactions.reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + 1;
                return acc;
            }, {});
            res.json({
                success: true,
                data: {
                    totalIncome,
                    totalExpenses,
                    netBalance: totalIncome - totalExpenses,
                    totalTransactions,
                    averageTransaction,
                    categoryCount
                }
            });
        }
        catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar estatísticas'
            });
        }
    }
}
exports.TransactionController = TransactionController;
exports.transactionController = new TransactionController();
//# sourceMappingURL=transactionController.js.map