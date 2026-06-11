import { Router } from 'express';
import { categoryController } from '../controllers/categoryController';

const router = Router();

// GET /api/categories - Obter todas as categorias
router.get('/', categoryController.getCategories);

// GET /api/categories/income - Obter categorias de receita
router.get('/income', categoryController.getCategoriesByType);

// GET /api/categories/expense - Obter categorias de despesa
router.get('/expense', categoryController.getCategoriesByType);

// GET /api/categories/usage - Obter categorias com contagem de uso
router.get('/usage', categoryController.getCategoriesWithUsage);

// GET /api/categories/top - Obter categorias mais usadas
router.get('/top', categoryController.getTopCategories);

// GET /api/categories/statistics - Obter estatísticas de categorias
router.get('/statistics', categoryController.getCategoryStatistics);

// POST /api/categories - Adicionar nova categoria
router.post('/', categoryController.addCategory);

// PUT /api/categories/:id - Atualizar categoria
router.put('/:id', categoryController.updateCategory);

// DELETE /api/categories/:id - Excluir categoria
router.delete('/:id', categoryController.deleteCategory);

export default router;