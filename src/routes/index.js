"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// Importar controladores
const transactionController_1 = require("../controllers/transactionController");
const shoppingController_1 = require("../controllers/shoppingController");
const creditCardController_1 = require("../controllers/creditCardController");
const budgetController_1 = require("../controllers/budgetController");
// Importar rotas
const transactions_1 = __importDefault(require("./transactions"));
const shopping_1 = __importDefault(require("./shopping"));
const creditCards_1 = __importDefault(require("./creditCards"));
const budgets_1 = __importDefault(require("./budgets"));
const router = (0, express_1.Router)();
// Rota de teste
router.get('/test', (req, res) => {
    res.json({ message: 'API está funcionando!' });
});
exports.default = router;
//# sourceMappingURL=index.js.map