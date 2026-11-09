"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const expenseController_1 = require("../controllers/expenseController");
const router = (0, express_1.Router)();
router.get('/', expenseController_1.expenseController.getExpenses);
router.post('/', expenseController_1.expenseController.addExpense);
router.put('/:id', expenseController_1.expenseController.updateExpense);
router.post('/:id/completed', expenseController_1.expenseController.setCompleted);
router.delete('/:id', expenseController_1.expenseController.deleteExpense);
exports.default = router;
//# sourceMappingURL=expenses.js.map