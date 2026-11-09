"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const incomeController_1 = require("../controllers/incomeController");
const router = (0, express_1.Router)();
router.get('/', incomeController_1.incomeController.getIncomes);
router.post('/', incomeController_1.incomeController.addIncome);
router.put('/:id', incomeController_1.incomeController.updateIncome);
router.delete('/:id', incomeController_1.incomeController.deleteIncome);
exports.default = router;
//# sourceMappingURL=incomes.js.map