import { Router } from 'express';
import { shoppingController } from '../controllers/shoppingController';

const router = Router();

// GET /api/shopping-list - Obter todos os itens da lista de compras
router.get('/', shoppingController.getShoppingItems);

// GET /api/shopping-list/active - Obter itens não comprados
router.get('/active', shoppingController.getActiveItems);

// GET /api/shopping-list/purchased - Obter itens comprados
router.get('/purchased', shoppingController.getPurchasedItems);

// GET /api/shopping-list/total - Calcular total estimado
router.get('/total', shoppingController.getTotalEstimated);

// POST /api/shopping-list - Adicionar novo item à lista de compras
router.post('/', shoppingController.addShoppingItem);

// PUT /api/shopping-list/:id - Atualizar item da lista de compras
router.put('/:id', shoppingController.updateShoppingItem);

// DELETE /api/shopping-list/:id - Excluir item da lista de compras
router.delete('/:id', shoppingController.deleteShoppingItem);

// PATCH /api/shopping-list/:id/toggle - Alternar status de comprado
router.patch('/:id/toggle', shoppingController.togglePurchased);

// DELETE /api/shopping-list/clear-purchased - Limpar itens comprados
router.delete('/clear-purchased', shoppingController.clearPurchased);

export default router;