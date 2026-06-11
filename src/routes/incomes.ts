import { Router } from 'express';
import { incomeController } from '../controllers/incomeController';

const router = Router();

router.get('/', incomeController.getIncomes);
router.post('/', incomeController.addIncome);
router.put('/:id', incomeController.updateIncome);
router.delete('/:id', incomeController.deleteIncome);

export default router;
