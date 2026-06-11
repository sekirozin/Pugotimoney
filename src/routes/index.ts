import { Router } from 'express';

// Importar controladores
import { transactionController } from '../controllers/transactionController';
import { shoppingController } from '../controllers/shoppingController';
import { creditCardController } from '../controllers/creditCardController';
import { budgetController } from '../controllers/budgetController';

// Importar rotas
import transactionRoutes from './transactions';
import shoppingRoutes from './shopping';
import creditCardRoutes from './creditCards';
import budgetRoutes from './budgets';

const router = Router();

// Rota de teste
router.get('/test', (req, res) => {
    res.json({ message: 'API está funcionando!' });
});

export default router;