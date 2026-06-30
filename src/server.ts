import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { database } from './models/database';
import { ReportSection, ReportService } from './services/reportService';
import { uploadMiddleware, processStatement } from './services/statementService';
import transactionRoutes from './routes/transactions';
import shoppingRoutes from './routes/shopping';
import creditCardRoutes from './routes/creditCards';
import budgetRoutes from './routes/budgets';
import installmentRoutes from './routes/installments';
import goalRoutes from './routes/goals';
import categoryRoutes from './routes/categories';
import dashboardRoutes from './routes/dashboard';
import incomeRoutes from './routes/incomes';
import { incomeOccursInMonth } from './utils/incomeRecurrence';
import profileRoutes from './routes/profile';
import authRoutes from './routes/auth';
import { AuthRequest, authMiddleware, adminMiddleware } from './middleware/auth';
import rateLimit from 'express-rate-limit';

dotenv.config();

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET não definido no arquivo .env');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Zima OS/Docker reverse proxies add X-Forwarded-For. Express-rate-limit
// needs trust proxy configured before the limiters run.
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
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
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Muitas tentativas. Tente novamente em 15 minutos.' }
});
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: 'Muitas requisições. Tente novamente em 15 minutos.' }
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
            return;
        }

        if (/\.(?:css|js|svg|png|jpg|jpeg|webp|ico)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// Rotas públicas (com rate limit restritivo)
app.use('/api/auth', authLimiter, authRoutes);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected'
    });
});

// Rotas protegidas (requerem autenticação e rate limit geral)
app.use('/api', apiLimiter);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/shopping-list', authMiddleware, shoppingRoutes);
app.use('/api/credit-cards', authMiddleware, creditCardRoutes);
app.use('/api/budgets', authMiddleware, budgetRoutes);
app.use('/api/installments', authMiddleware, installmentRoutes);
app.use('/api/goals', authMiddleware, goalRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/incomes', authMiddleware, incomeRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);

// Rota para dados iniciais (para o frontend)
app.get('/api/initial-data', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await database.processRecurringTransactions();
        const userId = req.user!.id;
        const transactions = await database.getTransactions(undefined, userId);
        const shoppingList = await database.getShoppingItems(userId);
        const creditCards = await database.getCreditCards(userId);
        const budgets = await database.getBudgets(userId);
        const installments = await database.getInstallments(userId);
        const goals = await database.getFinancialGoals(userId);
        const incomes = await database.getIncomes(userId);

        res.json({
            transactions,
            shoppingList,
            creditCards,
            budgets,
            installments,
            goals,
            incomes
        });
    } catch (error) {
        console.error('Erro ao buscar dados iniciais:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar dados iniciais'
        });
    }
});

// Rota para relatórios
app.get('/api/reports/monthly', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { month, year } = req.query;
        
        const transactions = await database.getTransactions(undefined, req.user!.id);
        const incomes = await database.getIncomes(req.user!.id);
        const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
        const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
        
        const monthlyTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() + 1 === targetMonth && date.getFullYear() === targetYear;
        });

        const income = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0)
            + incomes
                .filter(item => incomeOccursInMonth(item, targetMonth, targetYear))
                .reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const expenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const categoryBreakdown: Record<string, number> = {};
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
    } catch (error) {
        console.error('Erro ao gerar relatório mensal:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar relatório mensal'
        });
    }
});

// Rota para exportação de dados (admin)
app.get('/api/export/:type', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
        const { type } = req.params;
        
        let filename = 'export.csv';
        let data: any[] = [];

        switch (type) {
            case 'transactions':
                filename = 'transacoes.csv';
                data = await database.getTransactions(undefined, req.user!.id);
                break;
            case 'budgets':
                filename = 'orcamentos.csv';
                data = await database.getBudgets(req.user!.id);
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
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header];
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(csvContent);
    } catch (error) {
        console.error('Erro na exportação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro na exportação'
        });
    }
});

// Rota para extrato PDF mensal
app.get('/api/report/statement', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { year, month, sections } = req.query;
        const now = new Date();
        const targetYear = year ? parseInt(year as string) : now.getFullYear();
        const targetMonth = month ? parseInt(month as string) : now.getMonth() + 1;
        const allowedSections: ReportSection[] = ['installments', 'expenses', 'purchases', 'shopping', 'budgets', 'income', 'cards', 'goals'];
        const selectedSections = typeof sections === 'string'
            ? sections.split(',').filter((section): section is ReportSection => allowedSections.includes(section as ReportSection))
            : allowedSections;

        const pdfBuffer = await ReportService.generateMonthlyStatement(targetYear, targetMonth, selectedSections, req.user!.id);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=extrato-${targetYear}-${String(targetMonth).padStart(2, '0')}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Erro ao gerar extrato PDF:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar extrato PDF'
        });
    }
});

const statementUploadHandler: express.RequestHandler = (req, res, next) => {
    uploadMiddleware(req, res, (error: unknown) => {
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
app.post('/api/import/statement', authMiddleware, statementUploadHandler, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Nenhum arquivo enviado'
            });
        }

        const result = await processStatement(req.file.buffer, req.file.mimetype, req.file.originalname, {
            userId: (req as AuthRequest).user!.id
        });

        res.json({
            success: true,
            imported: result.imported,
            skipped: result.skipped,
            recognized: result.recognized,
            transactions: result.transactions,
            message: `${result.imported} transações importadas, ${result.skipped} duplicadas ignoradas`
        });
    } catch (error) {
        console.error('Erro ao importar extrato:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao importar extrato'
        });
    }
});

// Middleware de erro
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
            database.close();
        } catch (e) {
            console.log('Erro ao fechar banco:', e);
        }
        process.exit(0);
    });
});

export default app;
