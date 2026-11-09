"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionController = exports.TransactionController = void 0;
const financeService_1 = require("../services/financeService");
const database_1 = require("../models/database");
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
            if (req.query.limit !== undefined || req.query.offset !== undefined) {
                filters.limit = Number(req.query.limit || 50);
                filters.offset = Number(req.query.offset || 0);
                if (!Number.isInteger(filters.limit) || filters.limit < 1 || filters.limit > 100 || !Number.isInteger(filters.offset) || filters.offset < 0) {
                    return res.status(400).json({ success: false, error: 'Paginação inválida' });
                }
            }
            const transactions = await database_1.database.getTransactions(filters, req.user.id);
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
            const transaction = await database_1.database.getTransactions({ id: parseInt(id) }, req.user.id);
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
            if (transactionData.credit_card_id && !(await database_1.database.getCreditCards(req.user.id)).some(card => card.id === Number(transactionData.credit_card_id))) {
                return res.status(400).json({ success: false, error: 'Cartão não encontrado' });
            }
            const transactionId = await database_1.database.addTransaction(transactionData, req.user.id);
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
            if (updates.credit_card_id && !(await database_1.database.getCreditCards(req.user.id)).some(card => card.id === Number(updates.credit_card_id))) {
                return res.status(400).json({ success: false, error: 'Cartão não encontrado' });
            }
            const updated = await database_1.database.updateTransaction(parseInt(id), updates, req.user.id);
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
            const deleted = await database_1.database.deleteTransaction(parseInt(id), req.user.id);
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
            const targetYear = Number(year), targetMonth = Number(month);
            if (!Number.isInteger(targetYear) || targetYear < 1900 || targetYear > 9999 || !Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12)
                return res.status(400).json({ success: false, error: 'Período inválido' });
            const totals = financeService_1.finance.summary(await (0, financeService_1.financialData)(req.user.id), targetYear, targetMonth);
            const summary = { income: totals.income, expense: totals.expenses };
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
            const totals = await database_1.database.getCategoryTotals(type, req.user.id);
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
            const transactions = await database_1.database.getTransactions(undefined, req.user.id);
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
            const transactions = await database_1.database.getTransactions(undefined, req.user.id);
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