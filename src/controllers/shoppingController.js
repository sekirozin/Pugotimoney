"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shoppingController = exports.ShoppingController = void 0;
const express_1 = require("express");
const database_1 = require("../models/database");
const types_1 = require("../models/types");
class ShoppingController {
    // Obter todos os itens da lista de compras
    async getShoppingItems(req, res) {
        try {
            const items = await database_1.database.getShoppingItems();
            res.json({
                success: true,
                data: items,
                total: items.length
            });
        }
        catch (error) {
            console.error('Erro ao buscar itens da lista de compras:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar itens da lista de compras'
            });
        }
    }
    // Adicionar novo item à lista de compras
    async addShoppingItem(req, res) {
        try {
            const itemData = req.body;
            const item = await database_1.database.addShoppingItem(itemData);
            res.status(201).json({
                success: true,
                data: { id: item, ...itemData },
                message: 'Item adicionado à lista de compras com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao adicionar item à lista de compras:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao adicionar item à lista de compras'
            });
        }
    }
    // Atualizar item da lista de compras
    async updateShoppingItem(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const updated = await database_1.database.updateShoppingItem(parseInt(id), updates);
            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: 'Item não encontrado'
                });
            }
            res.json({
                success: true,
                message: 'Item atualizado com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao atualizar item da lista de compras:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar item da lista de compras'
            });
        }
    }
    // Excluir item da lista de compras
    async deleteShoppingItem(req, res) {
        try {
            const { id } = req.params;
            const deleted = await database_1.database.deleteShoppingItem(parseInt(id));
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Item não encontrado'
                });
            }
            res.json({
                success: true,
                message: 'Item excluído com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao excluir item da lista de compras:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao excluir item da lista de compras'
            });
        }
    }
    // Alternar status de comprado do item
    async togglePurchased(req, res) {
        try {
            const { id } = req.params;
            // Buscar item atual
            const items = await database_1.database.getShoppingItems();
            const item = items.find(i => i.id === parseInt(id));
            if (!item) {
                return res.status(404).json({
                    success: false,
                    error: 'Item não encontrado'
                });
            }
            // Atualizar status
            const updated = await database_1.database.updateShoppingItem(parseInt(id), {
                item: item.item,
                category: item.category,
                estimatedPrice: item.estimatedPrice || item.estimated_price,
                purchased: !item.purchased
            });
            if (!updated) {
                return res.status(400).json({
                    success: false,
                    error: 'Erro ao atualizar status do item'
                });
            }
            res.json({
                success: true,
                message: `Item marcado como ${!item.purchased ? 'comprado' : 'não comprado'} com sucesso`
            });
        }
        catch (error) {
            console.error('Erro ao alternar status do item:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao alternar status do item'
            });
        }
    }
    // Obter itens não comprados
    async getActiveItems(req, res) {
        try {
            const items = await database_1.database.getShoppingItems();
            const activeItems = items.filter(item => !item.purchased);
            res.json({
                success: true,
                data: activeItems,
                total: activeItems.length
            });
        }
        catch (error) {
            console.error('Erro ao buscar itens ativos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar itens ativos'
            });
        }
    }
    // Obter itens comprados
    async getPurchasedItems(req, res) {
        try {
            const items = await database_1.database.getShoppingItems();
            const purchasedItems = items.filter(item => item.purchased);
            res.json({
                success: true,
                data: purchasedItems,
                total: purchasedItems.length
            });
        }
        catch (error) {
            console.error('Erro ao buscar itens comprados:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar itens comprados'
            });
        }
    }
    // Calcular total estimado
    async getTotalEstimated(req, res) {
        try {
            const items = await database_1.database.getShoppingItems();
            const total = items.reduce((sum, item) => sum + item.estimatedPrice, 0);
            res.json({
                success: true,
                data: {
                    totalItems: items.length,
                    purchasedItems: items.filter(i => i.purchased).length,
                    activeItems: items.filter(i => !i.purchased).length,
                    totalEstimated: total,
                    remainingEstimated: total - items.filter(i => i.purchased).reduce((sum, i) => sum + i.estimatedPrice, 0)
                }
            });
        }
        catch (error) {
            console.error('Erro ao calcular total estimado:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao calcular total estimado'
            });
        }
    }
    // Limpar itens comprados
    async clearPurchased(req, res) {
        try {
            const items = await database_1.database.getShoppingItems();
            const purchasedItems = items.filter(item => item.purchased);
            // Excluir itens comprados
            for (const item of purchasedItems) {
                await database_1.database.deleteShoppingItem(item.id);
            }
            res.json({
                success: true,
                message: `${purchasedItems.length} itens comprados foram removidos`,
                itemsRemoved: purchasedItems.length
            });
        }
        catch (error) {
            console.error('Erro ao limpar itens comprados:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao limpar itens comprados'
            });
        }
    }
}
exports.ShoppingController = ShoppingController;
exports.shoppingController = new ShoppingController();
//# sourceMappingURL=shoppingController.js.map