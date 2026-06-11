"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryController = exports.CategoryController = void 0;
const express_1 = require("express");
const database_1 = require("../models/database");
const types_1 = require("../models/types");
class CategoryController {
    // Obter todas as categorias
    async getCategories(req, res) {
        try {
            const { type } = req.query;
            let categories = await database_1.database.getCategories();
            if (type && ['income', 'expense'].includes(type)) {
                categories = categories.filter(cat => cat.type === type);
            }
            res.json({
                success: true,
                data: categories,
                total: categories.length
            });
        }
        catch (error) {
            console.error('Erro ao buscar categorias:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar categorias'
            });
        }
    }
    // Adicionar nova categoria
    async addCategory(req, res) {
        try {
            const categoryData = req.body;
            // Validar dados
            if (!categoryData.name || !categoryData.type) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome e tipo são obrigatórios'
                });
            }
            if (!['income', 'expense'].includes(categoryData.type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Tipo deve ser income ou expense'
                });
            }
            const categoryId = await database_1.database.addCategory(categoryData);
            res.status(201).json({
                success: true,
                data: { id: categoryId, ...categoryData },
                message: 'Categoria adicionada com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao adicionar categoria:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao adicionar categoria'
            });
        }
    }
    // Obter categorias por tipo
    async getCategoriesByType(req, res) {
        try {
            const { type } = req.params;
            if (!['income', 'expense'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Tipo deve ser income ou expense'
                });
            }
            const categories = await database_1.database.getCategories();
            const filteredCategories = categories.filter(cat => cat.type === type);
            res.json({
                success: true,
                data: filteredCategories,
                total: filteredCategories.length
            });
        }
        catch (error) {
            console.error('Erro ao buscar categorias por tipo:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar categorias por tipo'
            });
        }
    }
    // Obter categorias com contagem de uso
    async getCategoriesWithUsage(req, res) {
        try {
            // Em uma implementação real, você contaria quantas transações usam cada categoria
            const categories = await database_1.database.getCategories();
            const categoriesWithUsage = categories.map(category => ({
                ...category,
                usageCount: Math.floor(Math.random() * 100) // Placeholder
            }));
            res.json({
                success: true,
                data: categoriesWithUsage
            });
        }
        catch (error) {
            console.error('Erro ao buscar categorias com uso:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar categorias com uso'
            });
        }
    }
    // Obter categorias mais usadas
    async getTopCategories(req, res) {
        try {
            const { type, limit } = req.query;
            const limitNum = limit ? parseInt(limit) : 5;
            // Em uma implementação real, você buscaria do banco de dados
            const categories = await database_1.database.getCategories();
            const filteredCategories = type && ['income', 'expense'].includes(type)
                ? categories.filter(cat => cat.type === type)
                : categories;
            // Ordenar por uso (placeholder)
            const sortedCategories = filteredCategories
                .sort((a, b) => {
                const usageA = Math.floor(Math.random() * 100);
                const usageB = Math.floor(Math.random() * 100);
                return usageB - usageA;
            })
                .slice(0, limitNum);
            res.json({
                success: true,
                data: sortedCategories,
                total: sortedCategories.length
            });
        }
        catch (error) {
            console.error('Erro ao buscar categorias mais usadas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar categorias mais usadas'
            });
        }
    }
    // Atualizar categoria
    async updateCategory(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            // Validar dados
            if (updates.type && !['income', 'expense'].includes(updates.type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Tipo deve ser income ou expense'
                });
            }
            const updated = await database_1.database.updateCategory(parseInt(id), updates);
            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: 'Categoria não encontrada'
                });
            }
            res.json({
                success: true,
                message: 'Categoria atualizada com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao atualizar categoria:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar categoria'
            });
        }
    }
    // Excluir categoria
    async deleteCategory(req, res) {
        try {
            const { id } = req.params;
            // Verificar se categoria está em uso (placeholder)
            const categories = await database_1.database.getCategories();
            const category = categories.find(cat => cat.id === parseInt(id));
            if (!category) {
                return res.status(404).json({
                    success: false,
                    error: 'Categoria não encontrada'
                });
            }
            // Em uma implementação real, você verificaria se há transações usando esta categoria
            const hasTransactions = Math.random() > 0.5; // Placeholder
            if (hasTransactions) {
                return res.status(400).json({
                    success: false,
                    error: 'Não é possível excluir categorias que estão em uso'
                });
            }
            const deleted = await database_1.database.deleteCategory(parseInt(id));
            if (!deleted) {
                return res.status(400).json({
                    success: false,
                    error: 'Erro ao excluir categoria'
                });
            }
            res.json({
                success: true,
                message: 'Categoria excluída com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao excluir categoria:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao excluir categoria'
            });
        }
    }
    // Obter estatísticas de categorias
    async getCategoryStatistics(req, res) {
        try {
            const categories = await database_1.database.getCategories();
            const stats = {
                totalCategories: categories.length,
                byType: {
                    income: categories.filter(cat => cat.type === 'income').length,
                    expense: categories.filter(cat => cat.type === 'expense').length
                },
                mostUsed: 'alimentacao', // Placeholder
                leastUsed: 'outros', // Placeholder
                averageUsage: 25 // Placeholder
            };
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            console.error('Erro ao buscar estatísticas de categorias:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar estatísticas de categorias'
            });
        }
    }
}
exports.CategoryController = CategoryController;
exports.categoryController = new CategoryController();
//# sourceMappingURL=categoryController.js.map