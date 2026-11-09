import { Router } from 'express';
import { installmentController } from '../controllers/installmentController';

const router = Router();

// GET /api/installments/groups - Obter grupos de parcelamentos
router.get('/groups', installmentController.getInstallmentGroups);

// POST /api/installments/groups - Adicionar grupo de parcelamentos
router.post('/groups', installmentController.addInstallmentGroup);

// PUT /api/installments/groups/:id - Atualizar grupo de parcelamentos
router.put('/groups/:id', installmentController.updateInstallmentGroup);

// DELETE /api/installments/groups/:id - Excluir grupo de parcelamentos
router.delete('/groups/:id', installmentController.deleteInstallmentGroup);

// GET /api/installments - Obter todos os parcelamentos
router.get('/', installmentController.getInstallments);

// POST /api/installments - Adicionar novo parcelamento
router.post('/', installmentController.addInstallment);

// PUT /api/installments/:id - Atualizar parcelamento
router.put('/:id', installmentController.updateInstallment);

// DELETE /api/installments/:id - Excluir parcelamento
router.delete('/:id', installmentController.deleteInstallment);

// GET /api/installments/upcoming - Obter parcelamentos próximos
router.get('/upcoming', installmentController.getUpcomingInstallments);

// GET /api/installments/completed - Obter parcelamentos concluídos
router.get('/completed', installmentController.getCompletedInstallments);

// POST /api/installments/:id/mark-paid - Marcar parcelamento como pago
router.post('/:id/mark-paid', installmentController.markInstallmentAsPaid);

export default router;