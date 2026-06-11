"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const categoryController_1 = require("../controllers/categoryController");
const router = (0, express_1.Router)();
// GET /api/categories - Obter todas as categorias
router.get('/', categoryController_1.categoryController.getCategories);
// GET /api/categories/income - Obter categorias de receita
router.get('/income', categoryController_1.categoryController.getCategoriesByType);
// GET /api/categories/expense - Obter categorias de despesa
router.get('/expense', categoryController_1.categoryController.getCategoriesByType);
// GET /api/categories/usage - Obter categorias com contagem de uso
router.get('/usage', categoryController_1.categoryController.getCategoriesWithUsage);
// GET /api/categories/top - Obter categorias mais usadas
router.get('/top', categoryController_1.categoryController.getTopCategories);
// GET /api/categories/statistics - Obter estatísticas de categorias
router.get('/statistics', categoryController_1.categoryController.getCategoryStatistics);
// POST /api/categories - Adicionar nova categoria
router.post('/', categoryController_1.categoryController.addCategory);
// PUT /api/categories/:id - Atualizar categoria
router.put('/:id', categoryController_1.categoryController.updateCategory);
// DELETE /api/categories/:id - Excluir categoria
router.delete('/:id', categoryController_1.categoryController.deleteCategory);
exports.default = router;
//# sourceMappingURL=categories.js.map