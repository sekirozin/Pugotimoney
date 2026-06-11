"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const router = (0, express_1.Router)();
// GET /api/dashboard - Obter dados do dashboard
router.get('/', dashboardController_1.dashboardController.getDashboard);
// GET /api/dashboard/financial-summary - Obter resumo financeiro
router.get('/financial-summary', dashboardController_1.dashboardController.getFinancialSummary);
// GET /api/dashboard/chart-data - Obter dados para gráficos
router.get('/chart-data', dashboardController_1.dashboardController.getChartData);
// GET /api/dashboard/recent-activity - Obter atividades recentes
router.get('/recent-activity', dashboardController_1.dashboardController.getRecentActivity);
exports.default = router;
//# sourceMappingURL=dashboard.js.map