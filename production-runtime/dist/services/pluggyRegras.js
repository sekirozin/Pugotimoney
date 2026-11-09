"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contraparteDe = contraparteDe;
exports.receitasDoMes = receitasDoMes;
exports.formaDePagamento = formaDePagamento;
exports.lancamentosNoPeriodo = lancamentosNoPeriodo;
exports.despesasDoMes = despesasDoMes;
exports.relatorioDoAno = relatorioDoAno;
const centavos = (valor) => Math.round(Math.abs(valor) * 100);
const diaNumero = (data) => Math.floor(Date.parse(`${data}T12:00:00Z`) / 86400000);
const categoria = (lancamento) => lancamento.categoria || '';
// Pluggy: "Same person transfer" (e variações) é transferência entre contas do mesmo titular.
// Ou o banco informou pagador e recebedor com o mesmo documento (vale também para conta própria não conectada).
const mesmaPessoa = (lancamento) => /same person/i.test(categoria(lancamento)) || lancamento.mesmoTitular === true;
const transferencia = (lancamento) => /transfer|pix/i.test(categoria(lancamento)) || lancamento.operacao === 'PIX' || lancamento.meio === 'PIX';
// Resgate de aplicação devolve dinheiro que já era seu; rendimento ("Proceeds interests and dividends") é receita.
const investimento = (lancamento) => /invest/i.test(categoria(lancamento)) && !/proceeds|interest|dividend/i.test(categoria(lancamento));
// O PicPay manda o pagamento da fatura na conta como "Pagamento de fatura PicPay Card" (categoria Transfers, operação OUTROS).
const pagamentoFatura = (lancamento) => /credit card payment/i.test(categoria(lancamento)) || lancamento.operacao === 'PAGAMENTO_FATURA' || /^pagamento d[ea] fatura/i.test(lancamento.descricao.trim());
/**
 * Movimento interno de carteira (ex.: PicPay "Recarga em carteira via Cartão de Crédito" + "Retirada de saldo por lastro"):
 * entrada e saída do mesmo valor, na mesma conta e no mesmo dia, com a saída marcada como mesma pessoa. Saldo zero; não é receita.
 */
function movimentosDeCarteira(visao) {
    const saidas = visao.lancamentos.filter(item => item.tipo === 'DEBIT' && mesmaPessoa(item));
    const usadas = new Set(), entradas = new Set();
    for (const entrada of visao.lancamentos) {
        if (entrada.tipo !== 'CREDIT' || mesmaPessoa(entrada))
            continue;
        const par = saidas.find(saida => !usadas.has(saida.ref) && saida.contaRef === entrada.contaRef && saida.data === entrada.data && centavos(saida.valor) === centavos(entrada.valor));
        if (par) {
            usadas.add(par.ref);
            entradas.add(entrada.ref);
        }
    }
    return { entradas, saidas: usadas };
}
/** Quando o banco não manda o nome da outra parte, ele costuma estar na descrição (PicPay: "PIX ENVIADO Fulano", "PicPay Card Débito - Loja"). */
const MODELOS_DE_NOME = [/^pix enviado\s+(?:para\s+)?(.+)$/i, /^pix recebido\s+(?:de\s+)?(.+)$/i, /^picpay card d[ée]bito\s*-\s*(.+)$/i];
function contraparteDe(item) {
    if (item.contraparte)
        return item.contraparte;
    for (const modelo of MODELOS_DE_NOME) {
        const nome = item.descricao.trim().match(modelo)?.[1]?.trim();
        if (nome)
            return { nome: nome.slice(0, 100), tipo: null };
    }
    return null;
}
/** Até quantos dias entre a saída numa conta e a chegada na outra o par conta como transferência própria. */
const JANELA_DIAS = 2;
/**
 * Créditos em conta corrente que pareiam com um débito do mesmo valor em outra conta conectada, em até 2 dias,
 * sendo os dois transferência/Pix: é dinheiro passando entre contas próprias que o banco não marcou como tal.
 */
function transferenciasPareadas(visao, creditos, debitosPareados, jaUsados = new Set()) {
    // Saídas já explicadas por um movimento de carteira não pareiam com mais nada.
    // Quando o banco diz que pagador e recebedor são titulares diferentes (`mesmoTitular === false`), não é transferência própria.
    const debitos = visao.lancamentos.filter(item => item.tipo === 'DEBIT' && item.status === 'POSTED' && transferencia(item) && item.mesmoTitular !== false && !jaUsados.has(item.ref));
    const usados = new Set();
    const pareados = new Set();
    for (const credito of creditos) {
        if (!transferencia(credito) || credito.mesmoTitular === false)
            continue;
        const valor = centavos(credito.valor), dia = diaNumero(credito.data);
        let melhor = null;
        for (const debito of debitos) {
            if (usados.has(debito.ref) || debito.contaRef === credito.contaRef || centavos(debito.valor) !== valor)
                continue;
            const distancia = Math.abs(diaNumero(debito.data) - dia);
            if (distancia > JANELA_DIAS)
                continue;
            if (!melhor || distancia < Math.abs(diaNumero(melhor.data) - dia))
                melhor = debito;
        }
        if (melhor) {
            usados.add(melhor.ref);
            pareados.add(credito.ref);
            debitosPareados?.add(melhor.ref);
        }
    }
    return pareados;
}
/** Receita do mês = dinheiro que entrou nas contas correntes conectadas, sem contar movimento entre contas próprias. */
/** `bancos`: refs dos itens a mostrar (sem filtro, todos). O pareamento de transferências sempre usa todas as contas. */
function receitasDoMes(visao, ano, mes, bancos) {
    const prefixo = `${ano}-${String(mes).padStart(2, '0')}`;
    const contas = new Map(visao.contas.map(conta => [conta.ref, conta]));
    const creditos = visao.lancamentos.filter(item => item.tipo === 'CREDIT' && contas.get(item.contaRef)?.tipo === 'BANK');
    const postados = creditos.filter(item => item.status === 'POSTED');
    // O pareamento olha todos os meses: um Pix pode sair no dia 31 e chegar no dia 1º.
    const carteira = movimentosDeCarteira(visao);
    const pareados = transferenciasPareadas(visao, postados.filter(item => !mesmaPessoa(item) && !carteira.entradas.has(item.ref)), undefined, carteira.saidas);
    const resultado = { total: 0, lancamentos: [], ignorados: { transferencias: 0, investimentos: 0, outros: 0, pendentes: 0 } };
    let soma = 0;
    const noFiltro = (credito) => !bancos || bancos.has(contas.get(credito.contaRef)?.itemRef || '');
    for (const item of creditos.filter(credito => credito.data.startsWith(prefixo) && noFiltro(credito))) {
        if (item.status !== 'POSTED') {
            resultado.ignorados.pendentes++;
            continue;
        }
        if (mesmaPessoa(item) || carteira.entradas.has(item.ref) || pareados.has(item.ref)) {
            resultado.ignorados.transferencias++;
            continue;
        }
        if (investimento(item)) {
            resultado.ignorados.investimentos++;
            continue;
        }
        if (pagamentoFatura(item)) {
            resultado.ignorados.outros++;
            continue;
        }
        soma += centavos(item.valor);
        resultado.lancamentos.push({ data: item.data, descricao: item.descricao, valor: centavos(item.valor) / 100, conta: contas.get(item.contaRef).nome, categoria: item.categoria || null, contraparte: contraparteDe(item)?.nome || null });
    }
    resultado.total = soma / 100;
    resultado.lancamentos.sort((a, b) => b.data.localeCompare(a.data));
    return resultado;
}
/** Forma de pagamento a partir da conta (cartão de crédito), do canal (`paymentData.paymentMethod`) e da operação do banco. */
function formaDePagamento(item, contaTipo) {
    const operacao = (item.operacao || '').toUpperCase(), meio = (item.meio || '').toUpperCase();
    if (contaTipo === 'CREDIT')
        return 'Crédito';
    if (meio === 'PIX' || operacao === 'PIX')
        return 'Pix';
    if (meio === 'TED' || operacao.includes('TED'))
        return 'TED';
    if (meio === 'DOC' || operacao.includes('DOC'))
        return 'DOC';
    if (operacao === 'CARTAO' || operacao.includes('DEBITO'))
        return 'Débito';
    if (operacao.includes('FOLHA'))
        return 'Salário';
    if (operacao.includes('RENDIMENTO'))
        return 'Rendimento';
    if (operacao.includes('BOLETO') || operacao === 'PAGAMENTO' || /bank slip|boleto/i.test(item.categoria || ''))
        return 'Boleto';
    return 'Outros';
}
/** Lançamentos reais de um período (datas inclusivas; sem limite, todo o histórico), classificados com as regras das receitas. `contaRef` limita a uma conta ou cartão. */
function lancamentosNoPeriodo(visao, de, ate, bancos, contaRef) {
    const contas = new Map(visao.contas.map(conta => [conta.ref, conta]));
    const carteira = movimentosDeCarteira(visao);
    const creditos = visao.lancamentos.filter(item => item.tipo === 'CREDIT' && item.status === 'POSTED' && contas.get(item.contaRef)?.tipo === 'BANK' && !mesmaPessoa(item) && !carteira.entradas.has(item.ref));
    const debitosPareados = new Set();
    const creditosPareados = transferenciasPareadas(visao, creditos, debitosPareados, carteira.saidas);
    return visao.lancamentos
        .filter(item => (!de || item.data >= de) && (!ate || item.data <= ate) && (!contaRef || item.contaRef === contaRef))
        .map(item => ({ item, conta: contas.get(item.contaRef) }))
        .filter(({ conta }) => conta && (!bancos || bancos.has(conta.itemRef || '')))
        .map(({ item, conta }) => ({
        ref: item.ref, data: item.data, descricao: item.descricao, valor: Math.abs(item.valor), tipo: item.tipo, pendente: item.status !== 'POSTED',
        conta: conta.nome, contaRef: item.contaRef, contaTipo: conta.tipo, bancoRef: conta.itemRef || null, categoria: item.categoria || null,
        parcela: item.parcela ? { numero: item.parcela.numero, total: item.parcela.total } : null,
        transferenciaPropria: mesmaPessoa(item) || carteira.entradas.has(item.ref) || creditosPareados.has(item.ref) || debitosPareados.has(item.ref),
        pagamentoFatura: pagamentoFatura(item),
        investimento: investimento(item),
        forma: formaDePagamento(item, conta.tipo),
        contraparte: contraparteDe(item)
    }))
        .sort((a, b) => b.data.localeCompare(a.data));
}
/** Despesas do mês = saídas das contas e compras no cartão, com as mesmas regras da aba Transações. */
function despesasDoMes(visao, ano, mes, bancos) {
    const prefixo = `${ano}-${String(mes).padStart(2, '0')}`;
    const resultado = { total: 0, lancamentos: [], ignorados: { transferencias: 0, investimentos: 0, faturas: 0 }, pendentes: 0 };
    let soma = 0;
    for (const item of lancamentosNoPeriodo(visao, `${prefixo}-01`, `${prefixo}-31`, bancos)) {
        if (item.tipo !== 'DEBIT')
            continue;
        if (item.transferenciaPropria) {
            resultado.ignorados.transferencias++;
            continue;
        }
        if (item.pagamentoFatura) {
            resultado.ignorados.faturas++;
            continue;
        }
        if (item.investimento) {
            resultado.ignorados.investimentos++;
            continue;
        }
        soma += centavos(item.valor);
        if (item.pendente)
            resultado.pendentes++;
        resultado.lancamentos.push({ data: item.data, descricao: item.descricao, valor: centavos(item.valor) / 100, conta: item.conta, categoria: item.categoria, forma: item.forma, contraparte: item.contraparte?.nome || null, parcela: item.parcela, pendente: item.pendente });
    }
    resultado.total = soma / 100;
    return resultado;
}
/** Agrupa por chave somando em centavos, do maior para o menor, até `limite` grupos. */
function agrupar(itens, chave, valor, limite) {
    const grupos = new Map();
    for (const item of itens) {
        const k = chave(item), grupo = grupos.get(k) || { total: 0, quantidade: 0 };
        grupo.total += centavos(valor(item));
        grupo.quantidade++;
        grupos.set(k, grupo);
    }
    return [...grupos].map(([k, g]) => ({ chave: k, total: g.total / 100, quantidade: g.quantidade })).sort((a, b) => b.total - a.total).slice(0, limite);
}
/** Até onde vai o histórico que o banco mandou: um mês antes do primeiro lançamento não tem "zero", tem falta de dados. */
function coberturaDoHistorico(visao, bancos) {
    const contas = new Map(visao.contas.map(conta => [conta.ref, conta]));
    let inicio = null, fim = null, inicioCartao = null;
    for (const item of visao.lancamentos) {
        const conta = contas.get(item.contaRef);
        if (!conta || (bancos && !bancos.has(conta.itemRef || '')))
            continue;
        if (!inicio || item.data < inicio)
            inicio = item.data;
        if (!fim || item.data > fim)
            fim = item.data;
        if (conta.tipo === 'CREDIT' && (!inicioCartao || item.data < inicioCartao))
            inicioCartao = item.data;
    }
    return { inicio, fim, inicioCartao };
}
function relatorioDoAno(visao, ano, mes, bancos) {
    const cobertura = coberturaDoHistorico(visao, bancos);
    const situacao = (m) => {
        const prefixo = `${ano}-${String(m).padStart(2, '0')}`, primeiro = `${prefixo}-01`, ultimo = `${prefixo}-31`;
        if (!cobertura.inicio || !cobertura.fim || ultimo < cobertura.inicio || primeiro > cobertura.fim)
            return 'sem-dados';
        // O histórico começa no meio do mês, ou o cartão só tem lançamentos a partir de um mês posterior.
        if (cobertura.inicio > primeiro || (cobertura.inicioCartao && cobertura.inicioCartao > primeiro))
            return 'parcial';
        return 'completo';
    };
    const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, receitas: receitasDoMes(visao, ano, i + 1, bancos).total, despesas: despesasDoMes(visao, ano, i + 1, bancos).total, situacao: situacao(i + 1) }));
    const despesas = despesasDoMes(visao, ano, mes, bancos).lancamentos, receitas = receitasDoMes(visao, ano, mes, bancos).lancamentos;
    return {
        meses,
        cobertura,
        categorias: agrupar(despesas, item => item.categoria, item => item.valor, 50).map(g => ({ categoria: g.chave, total: g.total, quantidade: g.quantidade })),
        destinos: agrupar(despesas.filter(item => item.contraparte), item => item.contraparte, item => item.valor, 8).map(g => ({ nome: g.chave, total: g.total, quantidade: g.quantidade })),
        origens: agrupar(receitas.filter(item => item.contraparte), item => item.contraparte, item => item.valor, 8).map(g => ({ nome: g.chave, total: g.total, quantidade: g.quantidade }))
    };
}
//# sourceMappingURL=pluggyRegras.js.map