import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';

const router = Router();

// GET /api/dashboard - Obter dados do dashboard
router.get('/', dashboardController.getDashboard);

// GET /api/dashboard/financial-summary - Obter resumo financeiro
router.get('/financial-summary', dashboardController.getFinancialSummary);

// GET /api/dashboard/chart-data - Obter dados para gráficos
router.get('/chart-data', dashboardController.getChartData);

// GET /api/dashboard/recent-activity - Obter atividades recentes
router.get('/recent-activity', dashboardController.getRecentActivity);

export default router;