"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finance = void 0;
exports.financialData = financialData;
const database_1 = require("../models/database");
exports.finance = require('../../public/js/finance-core.js');
async function financialData(userId) {
    const [transactions, incomes, expenses] = await Promise.all([database_1.database.getTransactions(undefined, userId), database_1.database.getIncomes(userId), database_1.database.getExpenses(userId)]);
    return { transactions, incomes, expenses };
}
//# sourceMappingURL=financeService.js.map