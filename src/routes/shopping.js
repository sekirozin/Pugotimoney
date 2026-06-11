"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shoppingController_1 = require("../controllers/shoppingController");
const router = (0, express_1.Router)();
// GET /api/shopping-list - Obter todos os itens da lista de compras
router.get('/', shoppingController_1.shoppingController.getShoppingItems);
// GET /api/shopping-list/active - Obter itens não comprados
router.get('/active', shoppingController_1.shoppingController.getActiveItems);
// GET /api/shopping-list/purchased - Obter itens comprados
router.get('/purchased', shoppingController_1.shoppingController.getPurchasedItems);
// GET /api/shopping-list/total - Calcular total estimado
router.get('/total', shoppingController_1.shoppingController.getTotalEstimated);
// POST /api/shopping-list - Adicionar novo item à lista de compras
router.post('/', shoppingController_1.shoppingController.addShoppingItem);
// PUT /api/shopping-list/:id - Atualizar item da lista de compras
router.put('/:id', shoppingController_1.shoppingController.updateShoppingItem);
// DELETE /api/shopping-list/:id - Excluir item da lista de compras
router.delete('/:id', shoppingController_1.shoppingController.deleteShoppingItem);
// PATCH /api/shopping-list/:id/toggle - Alternar status de comprado
router.patch('/:id/toggle', shoppingController_1.shoppingController.togglePurchased);
// DELETE /api/shopping-list/clear-purchased - Limpar itens comprados
router.delete('/clear-purchased', shoppingController_1.shoppingController.clearPurchased);
exports.default = router;
//# sourceMappingURL=shopping.js.map