import type { VisaoPluggy } from './pluggyService';

type Lancamento = VisaoPluggy['lancamentos'][number];
export type Receita = { data: string; descricao: string; valor: number; conta: string; categoria: string | null; contraparte: string | null };
export type ReceitasDoMes = {
    total: number;
    lancamentos: Receita[];
    /** Entradas que não são receita: transferência entre contas próprias, resgate de investimento, pagamento de fatura e lançamento pendente. */
    ignorados: { transferencias: number; investimentos: number; outros: number; pendentes: number };
};

const centavos = (valor: number) => Math.round(Math.abs(valor) * 100);
const diaNumero = (data: string) => Math.floor(Date.parse(`${data}T12:00:00Z`) / 86400000);
const categoria = (lancamento: Lancamento) => lancamento.categoria || '';
// Pluggy: "Same person transfer" (e variações) é transferência entre contas do mesmo titular.
// Ou o banco informou pagador e recebedor com o mesmo documento (vale também para conta própria não conectada).
const mesmaPessoa = (lancamento: Lancamento) => /same person/i.test(categoria(lancamento)) || lancamento.mesmoTitular === true;
const transferencia = (lancamento: Lancamento) => /transfer|pix/i.test(categoria(lancamento)) || lancamento.operacao === 'PIX' || lancamento.meio === 'PIX';
// Resgate de aplicação devolve dinheiro que já era seu; rendimento ("Proceeds interests and dividends") é receita.
const investimento = (lancamento: Lancamento) => /invest/i.test(categoria(lancamento)) && !/proceeds|interest|dividend/i.test(categoria(lancamento));
// O PicPay manda o pagamento da fatura na conta como "Pagamento de fatura PicPay Card" (categoria Transfers, operação OUTROS).
const pagamentoFatura = (lancamento: Lancamento) => /credit card payment/i.test(categoria(lancamento)) || lancamento.operacao === 'PAGAMENTO_FATURA' || /^pagamento d[ea] fatura/i.test(lancamento.descricao.trim());
/**
 * Movimento interno de carteira (ex.: PicPay "Recarga em carteira via Cartão de Crédito" + "Retirada de saldo por lastro"):
 * entrada e saída do mesmo valor, na mesma conta e no mesmo dia, com a saída marcada como mesma pessoa. Saldo zero; não é receita.
 */
function movimentosDeCarteira(visao: VisaoPluggy): { entradas: Set<string>; saidas: Set<string> } {
    const saidas = visao.lancamentos.filter(item => item.tipo === 'DEBIT' && mesmaPessoa(item));
    const usadas = new Set<string>(), entradas = new Set<string>();
    for (const entrada of visao.lancamentos) {
        if (entrada.tipo !== 'CREDIT' || mesmaPessoa(entrada)) continue;
        const par = saidas.find(saida => !usadas.has(saida.ref) && saida.contaRef === entrada.contaRef && saida.data === entrada.data && centavos(saida.valor) === centavos(entrada.valor));
        if (par) { usadas.add(par.ref); entradas.add(entrada.ref); }
    }
    return { entradas, saidas: usadas };
}

/** Quando o banco não manda o nome da outra parte, ele costuma estar na descrição (PicPay: "PIX ENVIADO Fulano", "PicPay Card Débito - Loja"). */
const MODELOS_DE_NOME: RegExp[] = [/^pix enviado\s+(?:para\s+)?(.+)$/i, /^pix recebido\s+(?:de\s+)?(.+)$/i, /^picpay card d[ée]bito\s*-\s*(.+)$/i];
export function contraparteDe(item: Lancamento): { nome: string; tipo: 'PF' | 'PJ' | null } | null {
    if (item.contraparte) return item.contraparte;
    for (const modelo of MODELOS_DE_NOME) {
        const nome = item.descricao.trim().match(modelo)?.[1]?.trim();
        if (nome) return { nome: nome.slice(0, 100), tipo: null };
    }
    return null;
}

/** Até quantos dias entre a saída numa conta e a chegada na outra o par conta como transferência própria. */
const JANELA_DIAS = 2;

/**
 * Créditos em conta corrente que pareiam com um débito do mesmo valor em outra conta conectada, em até 2 dias,
 * sendo os dois transferência/Pix: é dinheiro passando entre contas próprias que o banco não marcou como tal.
 */
function transferenciasPareadas(visao: VisaoPluggy, creditos: Lancamento[], debitosPareados?: Set<string>, jaUsados: Set<string> = new Set()): Set<string> {
    // Saídas já explicadas por um movimento de carteira não pareiam com mais nada.
    // Quando o banco diz que pagador e recebedor são titulares diferentes (`mesmoTitular === false`), não é transferência própria.
    const debitos = visao.lancamentos.filter(item => item.tipo === 'DEBIT' && item.status === 'POSTED' && transferencia(item) && item.mesmoTitular !== false && !jaUsados.has(item.ref));
    const usados = new Set<string>();
    const pareados = new Set<string>();
    for (const credito of creditos) {
        if (!transferencia(credito) || credito.mesmoTitular === false) continue;
        const valor = centavos(credito.valor), dia = diaNumero(credito.data);
        let melhor: Lancamento | null = null;
        for (const debito of debitos) {
            if (usados.has(debito.ref) || debito.contaRef === credito.contaRef || centavos(debito.valor) !== valor) continue;
            const distancia = Math.abs(diaNumero(debito.data) - dia);
            if (distancia > JANELA_DIAS) continue;
            if (!melhor || distancia < Math.abs(diaNumero(melhor.data) - dia)) melhor = debito;
        }
        if (melhor) { usados.add(melhor.ref); pareados.add(credito.ref); debitosPareados?.add(melhor.ref); }
    }
    return pareados;
}

/** Receita do mês = dinheiro que entrou nas contas correntes conectadas, sem contar movimento entre contas próprias. */
/** `bancos`: refs dos itens a mostrar (sem filtro, todos). O pareamento de transferências sempre usa todas as contas. */
export function receitasDoMes(visao: VisaoPluggy, ano: number, mes: number, bancos?: Set<string>): ReceitasDoMes {
    const prefixo = `${ano}-${String(mes).padStart(2, '0')}`;
    const contas = new Map(visao.contas.map(conta => [conta.ref, conta]));
    const creditos = visao.lancamentos.filter(item => item.tipo === 'CREDIT' && contas.get(item.contaRef)?.tipo === 'BANK');
    const postados = creditos.filter(item => item.status === 'POSTED');
    // O pareamento olha todos os meses: um Pix pode sair no dia 31 e chegar no dia 1º.
    const carteira = movimentosDeCarteira(visao);
    const pareados = transferenciasPareadas(visao, postados.filter(item => !mesmaPessoa(item) && !carteira.entradas.has(item.ref)), undefined, carteira.saidas);
    const resultado: ReceitasDoMes = { total: 0, lancamentos: [], ignorados: { transferencias: 0, investimentos: 0, outros: 0, pendentes: 0 } };
    let soma = 0;
    const noFiltro = (credito: Lancamento) => !bancos || bancos.has((contas.get(credito.contaRef) as { itemRef?: string } | undefined)?.itemRef || '');
    for (const item of creditos.filter(credito => credito.data.startsWith(prefixo) && noFiltro(credito))) {
        if (item.status !== 'POSTED') { resultado.ignorados.pendentes++; continue; }
        if (mesmaPessoa(item) || carteira.entradas.has(item.ref) || pareados.has(item.ref)) { resultado.ignorados.transferencias++; continue; }
        if (investimento(item)) { resultado.ignorados.investimentos++; continue; }
        if (pagamentoFatura(item)) { resultado.ignorados.outros++; continue; }
        soma += centavos(item.valor);
        resultado.lancamentos.push({ data: item.data, descricao: item.descricao, valor: centavos(item.valor) / 100, conta: contas.get(item.contaRef)!.nome, categoria: item.categoria || null, contraparte: contraparteDe(item)?.nome || null });
    }
    resultado.total = soma / 100;
    resultado.lancamentos.sort((a, b) => b.data.localeCompare(a.data));
    return resultado;
}

export type LancamentoDoMes = {
    ref: string; data: string; descricao: string; valor: number; tipo: 'CREDIT' | 'DEBIT'; pendente: boolean;
    conta: string; contaRef: string; contaTipo: 'BANK' | 'CREDIT'; bancoRef: string | null; categoria: string | null;
    parcela: { numero: number; total: number } | null;
    /** Entre contas do mesmo titular (categoria, mesmo documento ou par entre contas conectadas). */
    transferenciaPropria: boolean; pagamentoFatura: boolean;
    /** Aplicação (saída) ou resgate (entrada) de investimento: dinheiro que continua sendo seu. */
    investimento: boolean;
    /** Forma de pagamento: Crédito, Débito, Pix, TED, DOC, Boleto, Salário, Rendimento ou Outros. */
    forma: string;
    /** Quem pagou (entrada) ou quem recebeu (saída), quando o banco informa. */
    contraparte: { nome: string; tipo: 'PF' | 'PJ' | null } | null;
};

/** Forma de pagamento a partir da conta (cartão de crédito), do canal (`paymentData.paymentMethod`) e da operação do banco. */
export function formaDePagamento(item: Lancamento, contaTipo: 'BANK' | 'CREDIT'): string {
    const operacao = (item.operacao || '').toUpperCase(), meio = (item.meio || '').toUpperCase();
    if (contaTipo === 'CREDIT') return 'Crédito';
    if (meio === 'PIX' || operacao === 'PIX') return 'Pix';
    if (meio === 'TED' || operacao.includes('TED')) return 'TED';
    if (meio === 'DOC' || operacao.includes('DOC')) return 'DOC';
    if (operacao === 'CARTAO' || operacao.includes('DEBITO')) return 'Débito';
    if (operacao.includes('FOLHA')) return 'Salário';
    if (operacao.includes('RENDIMENTO')) return 'Rendimento';
    if (operacao.includes('BOLETO') || operacao === 'PAGAMENTO' || /bank slip|boleto/i.test(item.categoria || '')) return 'Boleto';
    return 'Outros';
}

/** Lançamentos reais de um período (datas inclusivas; sem limite, todo o histórico), classificados com as regras das receitas. `contaRef` limita a uma conta ou cartão. */
export function lancamentosNoPeriodo(visao: VisaoPluggy, de: string | null, ate: string | null, bancos?: Set<string>, contaRef?: string): LancamentoDoMes[] {
    const contas = new Map(visao.contas.map(conta => [conta.ref, conta]));
    const carteira = movimentosDeCarteira(visao);
    const creditos = visao.lancamentos.filter(item => item.tipo === 'CREDIT' && item.status === 'POSTED' && contas.get(item.contaRef)?.tipo === 'BANK' && !mesmaPessoa(item) && !carteira.entradas.has(item.ref));
    const debitosPareados = new Set<string>();
    const creditosPareados = transferenciasPareadas(visao, creditos, debitosPareados, carteira.saidas);
    return visao.lancamentos
        .filter(item => (!de || item.data >= de) && (!ate || item.data <= ate) && (!contaRef || item.contaRef === contaRef))
        .map(item => ({ item, conta: contas.get(item.contaRef) as (VisaoPluggy['contas'][number] & { itemRef?: string }) | undefined }))
        .filter(({ conta }) => conta && (!bancos || bancos.has(conta.itemRef || '')))
        .map(({ item, conta }) => ({
            ref: item.ref, data: item.data, descricao: item.descricao, valor: Math.abs(item.valor), tipo: item.tipo, pendente: item.status !== 'POSTED',
            conta: conta!.nome, contaRef: item.contaRef, contaTipo: conta!.tipo, bancoRef: conta!.itemRef || null, categoria: item.categoria || null,
            parcela: item.parcela ? { numero: item.parcela.numero, total: item.parcela.total } : null,
            transferenciaPropria: mesmaPessoa(item) || carteira.entradas.has(item.ref) || creditosPareados.has(item.ref) || debitosPareados.has(item.ref),
            pagamentoFatura: pagamentoFatura(item),
            investimento: investimento(item),
            forma: formaDePagamento(item, conta!.tipo),
            contraparte: contraparteDe(item)
        }))
        .sort((a, b) => b.data.localeCompare(a.data));
}

export type Despesa = {
    data: string; descricao: string; valor: number; conta: string; categoria: string | null; forma: string;
    contraparte: string | null; parcela: { numero: number; total: number } | null; pendente: boolean;
};
export type DespesasDoMes = {
    total: number;
    lancamentos: Despesa[];
    /** Saídas que não são despesa: transferência entre contas próprias, aplicação em investimento e pagamento de fatura (as compras já contam no cartão). */
    ignorados: { transferencias: number; investimentos: number; faturas: number };
    /** Quantas das despesas ainda estão pendentes no banco (já entram no total, como na aba Transações). */
    pendentes: number;
};

/** Despesas do mês = saídas das contas e compras no cartão, com as mesmas regras da aba Transações. */
export function despesasDoMes(visao: VisaoPluggy, ano: number, mes: number, bancos?: Set<string>): DespesasDoMes {
    const prefixo = `${ano}-${String(mes).padStart(2, '0')}`;
    const resultado: DespesasDoMes = { total: 0, lancamentos: [], ignorados: { transferencias: 0, investimentos: 0, faturas: 0 }, pendentes: 0 };
    let soma = 0;
    for (const item of lancamentosNoPeriodo(visao, `${prefixo}-01`, `${prefixo}-31`, bancos)) {
        if (item.tipo !== 'DEBIT') continue;
        if (item.transferenciaPropria) { resultado.ignorados.transferencias++; continue; }
        if (item.pagamentoFatura) { resultado.ignorados.faturas++; continue; }
        if (item.investimento) { resultado.ignorados.investimentos++; continue; }
        soma += centavos(item.valor);
        if (item.pendente) resultado.pendentes++;
        resultado.lancamentos.push({ data: item.data, descricao: item.descricao, valor: centavos(item.valor) / 100, conta: item.conta, categoria: item.categoria, forma: item.forma, contraparte: item.contraparte?.nome || null, parcela: item.parcela, pendente: item.pendente });
    }
    resultado.total = soma / 100;
    return resultado;
}

/** sem-dados: o mês está fora do histórico (antes do primeiro lançamento ou depois do último); parcial: falta parte do mês ou o histórico do cartão. */
export type SituacaoDoMes = 'completo' | 'parcial' | 'sem-dados';
export type Relatorio = {
    meses: { mes: number; receitas: number; despesas: number; situacao: SituacaoDoMes }[];
    /** Primeiro e último dia com lançamentos (contas e cartões dos bancos escolhidos) e primeiro dia com lançamentos de cartão. */
    cobertura: { inicio: string | null; fim: string | null; inicioCartao: string | null };
    /** Do mês escolhido: despesas por categoria e para quem foi / de quem veio mais dinheiro. */
    categorias: { categoria: string | null; total: number; quantidade: number }[];
    destinos: { nome: string; total: number; quantidade: number }[];
    origens: { nome: string; total: number; quantidade: number }[];
};

/** Agrupa por chave somando em centavos, do maior para o menor, até `limite` grupos. */
function agrupar<T>(itens: T[], chave: (item: T) => string | null, valor: (item: T) => number, limite: number) {
    const grupos = new Map<string | null, { total: number; quantidade: number }>();
    for (const item of itens) {
        const k = chave(item), grupo = grupos.get(k) || { total: 0, quantidade: 0 };
        grupo.total += centavos(valor(item)); grupo.quantidade++;
        grupos.set(k, grupo);
    }
    return [...grupos].map(([k, g]) => ({ chave: k, total: g.total / 100, quantidade: g.quantidade })).sort((a, b) => b.total - a.total).slice(0, limite);
}

/** Até onde vai o histórico que o banco mandou: um mês antes do primeiro lançamento não tem "zero", tem falta de dados. */
function coberturaDoHistorico(visao: VisaoPluggy, bancos?: Set<string>): Relatorio['cobertura'] {
    const contas = new Map(visao.contas.map(conta => [conta.ref, conta as VisaoPluggy['contas'][number] & { itemRef?: string }]));
    let inicio: string | null = null, fim: string | null = null, inicioCartao: string | null = null;
    for (const item of visao.lancamentos) {
        const conta = contas.get(item.contaRef);
        if (!conta || (bancos && !bancos.has(conta.itemRef || ''))) continue;
        if (!inicio || item.data < inicio) inicio = item.data;
        if (!fim || item.data > fim) fim = item.data;
        if (conta.tipo === 'CREDIT' && (!inicioCartao || item.data < inicioCartao)) inicioCartao = item.data;
    }
    return { inicio, fim, inicioCartao };
}

export function relatorioDoAno(visao: VisaoPluggy, ano: number, mes: number, bancos?: Set<string>): Relatorio {
    const cobertura = coberturaDoHistorico(visao, bancos);
    const situacao = (m: number): SituacaoDoMes => {
        const prefixo = `${ano}-${String(m).padStart(2, '0')}`, primeiro = `${prefixo}-01`, ultimo = `${prefixo}-31`;
        if (!cobertura.inicio || !cobertura.fim || ultimo < cobertura.inicio || primeiro > cobertura.fim) return 'sem-dados';
        // O histórico começa no meio do mês, ou o cartão só tem lançamentos a partir de um mês posterior.
        if (cobertura.inicio > primeiro || (cobertura.inicioCartao && cobertura.inicioCartao > primeiro)) return 'parcial';
        return 'completo';
    };
    const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, receitas: receitasDoMes(visao, ano, i + 1, bancos).total, despesas: despesasDoMes(visao, ano, i + 1, bancos).total, situacao: situacao(i + 1) }));
    const despesas = despesasDoMes(visao, ano, mes, bancos).lancamentos, receitas = receitasDoMes(visao, ano, mes, bancos).lancamentos;
    return {
        meses,
        cobertura,
        categorias: agrupar(despesas, item => item.categoria, item => item.valor, 50).map(g => ({ categoria: g.chave, total: g.total, quantidade: g.quantidade })),
        destinos: agrupar(despesas.filter(item => item.contraparte), item => item.contraparte, item => item.valor, 8).map(g => ({ nome: g.chave!, total: g.total, quantidade: g.quantidade })),
        origens: agrupar(receitas.filter(item => item.contraparte), item => item.contraparte, item => item.valor, 8).map(g => ({ nome: g.chave!, total: g.total, quantidade: g.quantidade }))
    };
}
