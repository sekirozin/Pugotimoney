"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const installmentController_1 = require("../controllers/installmentController");
const router = (0, express_1.Router)();
// GET /api/installments/groups - Obter grupos de parcelamentos
router.get('/groups', installmentController_1.installmentController.getInstallmentGroups);
// POST /api/installments/groups - Adicionar grupo de parcelamentos
router.post('/groups', installmentController_1.installmentController.addInstallmentGroup);
// PUT /api/installments/groups/:id - Atualizar grupo de parcelamentos
router.put('/groups/:id', installmentController_1.installmentController.updateInstallmentGroup);
// DELETE /api/installments/groups/:id - Excluir grupo de parcelamentos
router.delete('/groups/:id', installmentController_1.installmentController.deleteInstallmentGroup);
// GET /api/installments - Obter todos os parcelamentos
router.get('/', installmentController_1.installmentController.getInstallments);
// POST /api/installments - Adicionar novo parcelamento
router.post('/', installmentController_1.installmentController.addInstallment);
// PUT /api/installments/:id - Atualizar parcelamento
router.put('/:id', installmentController_1.installmentController.updateInstallment);
// DELETE /api/installments/:id - Excluir parcelamento
router.delete('/:id', installmentController_1.installmentController.deleteInstallment);
// GET /api/installments/upcoming - Obter parcelamentos próximos
router.get('/upcoming', installmentController_1.installmentController.getUpcomingInstallments);
// GET /api/installments/completed - Obter parcelamentos concluídos
router.get('/completed', installmentController_1.installmentController.getCompletedInstallments);
// POST /api/installments/:id/mark-paid - Marcar parcelamento como pago
router.post('/:id/mark-paid', installmentController_1.installmentController.markInstallmentAsPaid);
exports.default = router;
//# sourceMappingURL=installments.js.map