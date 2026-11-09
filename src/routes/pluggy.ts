import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getPugotiLabSession } from '../controllers/authController';
import { lerVisaoPluggy, pluggyAtivo, usuarioPluggy } from '../services/pluggyService';
import { despesasDoMes, lancamentosNoPeriodo, receitasDoMes, relatorioDoAno } from '../services/pluggyRegras';

const router = Router();

/** O pedido é do dono das contas conectadas, com o mesmo usuário no token e na sessão do PugotiLab. Lança se a sessão for inválida. */
export function donoDasContas(req: AuthRequest): boolean {
    const sessao = getPugotiLabSession(req);
    return Boolean(req.user && usuarioPluggy() && req.user.username.toLowerCase() === usuarioPluggy().toLowerCase() && sessao.username.toLowerCase() === req.user.username.toLowerCase());
}

router.use((req: AuthRequest, res, next) => {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Vary', 'Authorization, Cookie');
    if (!pluggyAtivo()) return res.status(503).json({ success: false, error: 'Integração financeira desativada' });
    try {
        if (!donoDasContas(req)) return res.status(403).json({ success: false, error: 'Acesso não autorizado' });
        next();
    } catch {
        return res.status(401).json({ success: false, error: 'Sessão inválida' });
    }
});

router.get('/visao', async (req, res) => {
    try {
        const visao = await lerVisaoPluggy();
        if (!visao) return res.status(404).json({ success: false, error: 'Nenhuma sincronização disponível' });
        const limite = Math.min(500, Math.max(1, Number(req.query.limite) || 100));
        const lancamentos = visao.lancamentos.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, limite);
        res.json({ success: true, atualizadoEm: visao.atualizadoEm, origem: visao.origem, itens: visao.itens || [], contas: visao.contas, investimentos: visao.investimentos || [], totalLancamentos: visao.lancamentos.length, lancamentos });
    } catch {
        res.status(503).json({ success: false, error: 'Dados financeiros indisponíveis' });
    }
});

// ?bancos=ref1,ref2 limita aos bancos escolhidos no filtro da tela.
export const filtroBancos = (valor: unknown) => typeof valor === 'string' && valor ? new Set(valor.split(',').filter(ref => /^[0-9a-f]{32}$/.test(ref)).slice(0, 10)) : undefined;
const periodo = (query: any) => { const ano = Number(query.ano), mes = Number(query.mes); return Number.isInteger(ano) && ano >= 2000 && ano <= 2100 && Number.isInteger(mes) && mes >= 1 && mes <= 12 ? { ano, mes } : null; };

// Transações: lançamentos reais de contas e cartões num período (?de=AAAA-MM-DD&ate=AAAA-MM-DD; sem datas, todo o histórico; ?conta=ref só de uma conta ou cartão).
const dataValida = (valor: unknown) => typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(valor)) ? valor : null;
router.get('/lancamentos', async (req, res) => {
    const de = dataValida(req.query.de), ate = dataValida(req.query.ate);
    const conta = typeof req.query.conta === 'string' && /^[0-9a-f]{32}$/.test(req.query.conta) ? req.query.conta : undefined;
    if ((req.query.de && !de) || (req.query.ate && !ate) || (de && ate && de > ate) || (req.query.conta && !conta)) return res.status(400).json({ success: false, error: 'Período inválido' });
    try {
        const visao = await lerVisaoPluggy();
        if (!visao) return res.status(404).json({ success: false, error: 'Nenhuma sincronização disponível' });
        res.json({ success: true, atualizadoEm: visao.atualizadoEm, lancamentos: lancamentosNoPeriodo(visao, de, ate, filtroBancos(req.query.bancos), conta) });
    } catch {
        res.status(503).json({ success: false, error: 'Dados financeiros indisponíveis' });
    }
});

// Receitas do mês: dinheiro que entrou nas contas correntes conectadas, sem transferências entre contas próprias.
router.get('/receitas', async (req, res) => {
    const ano = Number(req.query.ano), mes = Number(req.query.mes);
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
        return res.status(400).json({ success: false, error: 'Período inválido' });
    }
    try {
        const visao = await lerVisaoPluggy();
        if (!visao) return res.status(404).json({ success: false, error: 'Nenhuma sincronização disponível' });
        res.json({ success: true, atualizadoEm: visao.atualizadoEm, ...receitasDoMes(visao, ano, mes, filtroBancos(req.query.bancos)) });
    } catch {
        res.status(503).json({ success: false, error: 'Dados financeiros indisponíveis' });
    }
});

// Despesas do mês: saídas das contas e compras no cartão, sem transferências próprias, investimentos nem pagamento de fatura.
router.get('/despesas', async (req, res) => {
    const alvo = periodo(req.query);
    if (!alvo) return res.status(400).json({ success: false, error: 'Período inválido' });
    try {
        const visao = await lerVisaoPluggy();
        if (!visao) return res.status(404).json({ success: false, error: 'Nenhuma sincronização disponível' });
        res.json({ success: true, atualizadoEm: visao.atualizadoEm, ...despesasDoMes(visao, alvo.ano, alvo.mes, filtroBancos(req.query.bancos)) });
    } catch {
        res.status(503).json({ success: false, error: 'Dados financeiros indisponíveis' });
    }
});

// Relatórios: receitas e despesas de cada mês do ano e, do mês escolhido, despesas por categoria e maiores destinos/origens.
router.get('/relatorio', async (req, res) => {
    const alvo = periodo(req.query);
    if (!alvo) return res.status(400).json({ success: false, error: 'Período inválido' });
    try {
        const visao = await lerVisaoPluggy();
        if (!visao) return res.status(404).json({ success: false, error: 'Nenhuma sincronização disponível' });
        res.json({ success: true, atualizadoEm: visao.atualizadoEm, ...relatorioDoAno(visao, alvo.ano, alvo.mes, filtroBancos(req.query.bancos)) });
    } catch {
        res.status(503).json({ success: false, error: 'Dados financeiros indisponíveis' });
    }
});

export default router;
