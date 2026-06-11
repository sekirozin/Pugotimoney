"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./models/database");
const reportService_1 = require("./services/reportService");
const statementService_1 = require("./services/statementService");
const transactions_1 = __importDefault(require("./routes/transactions"));
const shopping_1 = __importDefault(require("./routes/shopping"));
const creditCards_1 = __importDefault(require("./routes/creditCards"));
const budgets_1 = __importDefault(require("./routes/budgets"));
const installments_1 = __importDefault(require("./routes/installments"));
const goals_1 = __importDefault(require("./routes/goals"));
const categories_1 = __importDefault(require("./routes/categories"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const incomes_1 = __importDefault(require("./routes/incomes"));
const profile_1 = __importDefault(require("./routes/profile"));
const auth_1 = __importDefault(require("./routes/auth"));
const auth_2 = require("./middleware/auth");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
dotenv_1.default.config();
if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET não definido no arquivo .env');
    process.exit(1);
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            frameSrc: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            baseUri: ["'self'"],
            upgradeInsecureRequests: []
        }
    }
}));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
// Rate limiters
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Muitas tentativas. Tente novamente em 15 minutos.' }
});
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: 'Muitas requisições. Tente novamente em 15 minutos.' }
});
// Servir arquivos estáticos
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Rotas públicas (com rate limit restritivo)
app.use('/api/auth', authLimiter, auth_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected'
    });
});
// Rotas protegidas (requerem autenticação e rate limit geral)
app.use('/api', apiLimiter);
app.use('/api/transactions', auth_2.authMiddleware, transactions_1.default);
app.use('/api/shopping-list', auth_2.authMiddleware, shopping_1.default);
app.use('/api/credit-cards', auth_2.authMiddleware, creditCards_1.default);
app.use('/api/budgets', auth_2.authMiddleware, budgets_1.default);
app.use('/api/installments', auth_2.authMiddleware, installments_1.default);
app.use('/api/goals', auth_2.authMiddleware, goals_1.default);
app.use('/api/categories', auth_2.authMiddleware, categories_1.default);
app.use('/api/dashboard', auth_2.authMiddleware, dashboard_1.default);
app.use('/api/incomes', auth_2.authMiddleware, incomes_1.default);
app.use('/api/profile', auth_2.authMiddleware, profile_1.default);
// Rota para dados iniciais (para o frontend)
app.get('/api/initial-data', auth_2.authMiddleware, async (req, res) => {
    try {
        await database_1.database.processRecurringTransactions();
        await database_1.database.processInstallmentAdvancement();
        const transactions = await database_1.database.getTransactions();
        const shoppingList = await database_1.database.getShoppingItems();
        const creditCards = await database_1.database.getCreditCards();
        const budgets = await database_1.database.getBudgets();
        const installments = await database_1.database.getInstallments();
        const goals = await database_1.database.getFinancialGoals();
        const incomes = await database_1.database.getIncomes();
        res.json({
            transactions,
            shoppingList,
            creditCards,
            budgets,
            installments,
            goals,
            incomes
        });
    }
    catch (error) {
        console.error('Erro ao buscar dados iniciais:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar dados iniciais'
        });
    }
});
// Rota para relatórios
app.get('/api/reports/monthly', auth_2.authMiddleware, async (req, res) => {
    try {
        const { month, year } = req.query;
        const transactions = await database_1.database.getTransactions();
        const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();
        const monthlyTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() + 1 === targetMonth && date.getFullYear() === targetYear;
        });
        const income = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        const categoryBreakdown = {};
        monthlyTransactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
            categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
        });
        res.json({
            success: true,
            data: {
                income,
                expenses,
                balance: income - expenses,
                categoryBreakdown
            }
        });
    }
    catch (error) {
        console.error('Erro ao gerar relatório mensal:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar relatório mensal'
        });
    }
});
// Rota para exportação de dados (admin)
app.get('/api/export/:type', auth_2.authMiddleware, auth_2.adminMiddleware, async (req, res) => {
    try {
        const { type } = req.params;
        let filename = 'export.csv';
        let data = [];
        switch (type) {
            case 'transactions':
                filename = 'transacoes.csv';
                data = await database_1.database.getTransactions();
                break;
            case 'budgets':
                filename = 'orcamentos.csv';
                data = await database_1.database.getBudgets();
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Tipo de exportação inválido'
                });
        }
        const headers = Object.keys(data[0] || {});
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header];
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(','))
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(csvContent);
    }
    catch (error) {
        console.error('Erro na exportação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro na exportação'
        });
    }
});
// Rota para extrato PDF mensal
app.get('/api/report/statement', auth_2.authMiddleware, auth_2.adminMiddleware, async (req, res) => {
    try {
        const { year, month, sections } = req.query;
        const now = new Date();
        const targetYear = year ? parseInt(year) : now.getFullYear();
        const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
        const allowedSections = ['installments', 'expenses', 'purchases', 'shopping', 'budgets', 'income', 'cards', 'goals'];
        const selectedSections = typeof sections === 'string'
            ? sections.split(',').filter((section) => allowedSections.includes(section))
            : allowedSections;
        const pdfBuffer = await reportService_1.ReportService.generateMonthlyStatement(targetYear, targetMonth, selectedSections);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=extrato-${targetYear}-${String(targetMonth).padStart(2, '0')}.pdf`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Erro ao gerar extrato PDF:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar extrato PDF'
        });
    }
});
const statementUploadHandler = (req, res, next) => {
    (0, statementService_1.uploadMiddleware)(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro ao receber arquivo'
            });
        }
        next();
    });
};
// Rota para importação de extrato bancário
app.post('/api/import/statement', auth_2.authMiddleware, statementUploadHandler, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Nenhum arquivo enviado'
            });
        }
        const result = await (0, statementService_1.processStatement)(req.file.buffer, req.file.mimetype, req.file.originalname);
        res.json({
            success: true,
            imported: result.imported,
            skipped: result.skipped,
            recognized: result.recognized,
            transactions: result.transactions,
            message: `${result.imported} transações importadas, ${result.skipped} duplicadas ignoradas`
        });
    }
    catch (error) {
        console.error('Erro ao importar extrato:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao importar extrato'
        });
    }
});
// Middleware de erro
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
    });
});
// Middleware 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Rota não encontrada'
    });
});
// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Frontend disponível em: http://localhost:${PORT}`);
    console.log(`API disponível em: http://localhost:${PORT}/api`);
    process.on('SIGINT', () => {
        console.log('Fechando conexão com o banco de dados...');
        try {
            database_1.database.close();
        }
        catch (e) {
            console.log('Erro ao fechar banco:', e);
        }
        process.exit(0);
    });
});
exports.default = app;
//# sourceMappingURL=server.js.map