import { createHmac, hkdfSync } from 'node:crypto';
import path from 'node:path';
import { criptografar, descriptografar, lerChave, lerCifrado, lerSegredo, salvarCifrado } from './pluggyVault';

/** Dados do cartão de crédito vindos do banco (`creditData`). */
type DadosCartao = { limite: number | null; disponivel: number | null; fechamento: string | null; vencimento: string | null; minimo: number | null };
/** Fatura do cartão (Open Finance): pagamentos sem modo nem identificação, só data, valor e tipo (total/mínimo). */
type Fatura = { ref?: string; vencimento: string; total: number; minimo: number | null; pagamentos: { data: string | null; valor: number; tipo: string | null }[]; pago?: number; situacao?: 'paga' | 'parcial' | 'em_aberto' | 'vencida' };
/** Fechamento estimado: quantos dias antes do vencimento a fatura fecha (intervalo, das datas das compras de cada fatura). */
type Ciclo = { diasAntesDoVencimento: [number, number] };
type Conta = { ref: string; itemRef: string; tipo: 'BANK' | 'CREDIT'; nome: string; saldo: number; moeda: string; cartao?: DadosCartao & { faturas?: Fatura[] | null; ciclo?: Ciclo | null } };
type Parcela = { numero: number; total: number; compra: string | null };
type Lancamento = {
    ref: string; contaRef: string; data: string; descricao: string; valor: number; tipo: 'CREDIT' | 'DEBIT'; status: 'PENDING' | 'POSTED'; moeda: string;
    /** Classificação do banco (`operationType`, ex.: PIX, PAGAMENTO_FATURA, ESTORNO) e canal (`paymentData.paymentMethod`). */
    operacao?: string | null; meio?: string | null; categoria?: string | null; parcela?: Parcela | null;
    /** Pagador e recebedor com o mesmo CPF/CNPJ (transferência entre contas do mesmo titular). Só o resultado é guardado, nunca o documento. */
    mesmoTitular?: boolean | null;
    /** Fatura a que a compra no cartão pertence (`creditCardMetadata.billId`, como referência). */
    faturaRef?: string | null;
    /** Outra parte (pedido do usuário): quem pagou, numa entrada; quem recebeu, numa saída. Só nome e se é pessoa ou empresa, nunca o documento. */
    contraparte?: { nome: string; tipo: 'PF' | 'PJ' | null } | null;
};
type Investimento = { ref: string; itemRef: string; nome: string; tipo: string; subtipo: string | null; saldo: number; moeda: string };
/** Uma conexão (um banco autorizado no Meu Pluggy). `desatualizado`: o banco não respondeu e os dados dele são da sincronização anterior. */
type Item = { ref: string; banco?: string; status: string; consentimentoExpiraEm: string | null; desatualizado: boolean; investimentosDisponiveis: boolean };
export type VisaoPluggy = { versao?: 2; atualizadoEm: string; origem: 'MeuPluggy'; itens?: Item[]; contas: Conta[]; lancamentos: Lancamento[]; investimentos?: Investimento[] };

type ConfiguracaoLeitura = { usuario: string; chave: Buffer; arquivo: string };
type Configuracao = ConfiguracaoLeitura & { itemIds: string[]; clientId: string; clientSecret: string };
const API = 'https://api.pluggy.ai';
/** O Meu Pluggy gratuito permite até 5 conexões. */
const MAX_ITENS = 5;
let chaveApi: { valor: string; expiraEm: number } | null = null;
let sincronizacao: Promise<VisaoPluggy> | null = null;

export function pluggyAtivo(): boolean { return process.env.PLUGGY_ENABLED === '1'; }
export function usuarioPluggy(): string { return process.env.PLUGGY_OWNER_USERNAME || ''; }

async function configuracaoLeitura(): Promise<ConfiguracaoLeitura> {
    if (!pluggyAtivo()) throw new Error('Integração Pluggy desativada');
    const usuario = usuarioPluggy();
    const chaveArquivo = process.env.PLUGGY_DATA_KEY_FILE;
    const arquivo = process.env.PLUGGY_SNAPSHOT_PATH;
    if (!usuario || !chaveArquivo || !arquivo || !path.isAbsolute(chaveArquivo) || !path.isAbsolute(arquivo)) {
        throw new Error('Configuração Pluggy incompleta');
    }
    const chaveTexto = await lerSegredo(path.dirname(chaveArquivo), path.basename(chaveArquivo));
    return { usuario, chave: lerChave(chaveTexto), arquivo };
}

async function configuracaoSync(): Promise<Configuracao> {
    const leitura = await configuracaoLeitura();
    const diretorio = process.env.PLUGGY_SYNC_SECRET_DIR;
    if (!diretorio || !path.isAbsolute(diretorio)) throw new Error('Segredos de sincronização ausentes');
    const [itens, clientId, clientSecret] = await Promise.all([
        lerSegredo(diretorio, 'item_id'), lerSegredo(diretorio, 'client_id'),
        lerSegredo(diretorio, 'client_secret')
    ]);
    // Um itemId por linha: cada banco autorizado no Meu Pluggy é uma conexão própria.
    const itemIds = [...new Set(itens.split(/\s+/).filter(Boolean))];
    if (!itemIds.length || itemIds.length > MAX_ITENS || itemIds.some(id => !/^[0-9a-f-]{36}$/i.test(id))) throw new Error('Identificador de conexão inválido');
    return { ...leitura, itemIds, clientId, clientSecret };
}

async function respostaJson(url: string, opcoes: RequestInit): Promise<any> {
    const destino = new URL(url);
    if (destino.origin !== API) throw new Error('Destino da API não permitido');
    const resposta = await fetch(destino, { ...opcoes, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!resposta.ok) throw new Error(`Pluggy indisponível (${resposta.status})`);
    const tamanho = Number(resposta.headers.get('content-length') || 0);
    if (tamanho > 8 * 1024 * 1024) throw new Error('Resposta Pluggy acima do limite');
    if (!resposta.body) throw new Error('Resposta Pluggy vazia');
    const leitor = resposta.body.getReader();
    const partes: Buffer[] = [];
    let bytes = 0;
    while (true) {
        const { done, value } = await leitor.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 8 * 1024 * 1024) {
            await leitor.cancel();
            throw new Error('Resposta Pluggy acima do limite');
        }
        partes.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(partes, bytes).toString('utf8'));
}

async function obterChaveApi(config: Configuracao): Promise<string> {
    if (chaveApi && Date.now() < chaveApi.expiraEm) return chaveApi.valor;
    const dados = await respostaJson(`${API}/auth`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: config.clientId, clientSecret: config.clientSecret })
    });
    if (typeof dados.apiKey !== 'string' || !dados.apiKey) throw new Error('Autenticação Pluggy inválida');
    chaveApi = { valor: dados.apiKey, expiraEm: Date.now() + 105 * 60 * 1000 };
    return chaveApi.valor;
}

function referencia(chave: Buffer, tipo: string, id: string): string {
    const chaveReferencias = hkdfSync('sha256', chave, Buffer.alloc(0), 'pugotimoney-pluggy-referencias-v1', 32);
    return createHmac('sha256', Buffer.from(chaveReferencias)).update(`${tipo}:${id}`).digest('hex').slice(0, 32);
}

function lista(valor: unknown): any[] {
    if (!valor || typeof valor !== 'object' || !Array.isArray((valor as any).results)) throw new Error('Formato Pluggy inesperado');
    return (valor as any).results;
}

async function consultar(caminho: string, apiKey: string): Promise<any> {
    return respostaJson(`${API}${caminho}`, { method: 'GET', headers: { 'X-API-KEY': apiKey } });
}

// Campos opcionais: só texto curto ou número finito; o resto vira null.
const texto = (valor: unknown, limite: number) => typeof valor === 'string' && valor.trim() ? valor.trim().slice(0, limite) : null;
const numero = (valor: unknown) => typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
// Nome da outra parte; PF/PJ pelo tamanho do documento (11 ou 14 dígitos), sem guardar o número.
const parte = (dados: any) => {
    const nome = texto(dados?.name, 100);
    if (!nome) return null;
    const digitos = documento(dados)?.length;
    return { nome, tipo: digitos === 11 ? 'PF' as const : digitos === 14 ? 'PJ' as const : null };
};
// Documento de pagador/recebedor (`paymentData.*.documentNumber`), só dígitos, para comparar na memória.
const documento = (parte: any) => { const bruto = parte?.documentNumber?.value ?? parte?.documentNumber; return typeof bruto === 'string' && bruto.replace(/\D/g, '').length >= 11 ? bruto.replace(/\D/g, '') : null; };
const dia = (valor: unknown) => typeof valor === 'string' && !Number.isNaN(Date.parse(valor)) ? valor.slice(0, 10) : null;

async function paginado(caminho: string, apiKey: string, maxPaginas: number, erro: string): Promise<any[]> {
    const registros: any[] = [];
    let pagina = 1, totalPaginas = 1;
    do {
        const resposta = await consultar(`${caminho}&page=${pagina}`, apiKey);
        registros.push(...lista(resposta));
        if (!Number.isInteger(resposta.totalPages) || resposta.totalPages > maxPaginas || resposta.totalPages < 0) throw new Error(erro);
        totalPaginas = resposta.totalPages;
        pagina++;
    } while (pagina <= totalPaginas);
    return registros;
}

/** Últimas 6 faturas do cartão; `null` quando o banco não as oferece (não derruba a sincronização). */
async function faturasDoCartao(contaId: string, apiKey: string, chave: Buffer): Promise<Fatura[] | null> {
    try {
        const faturas: Fatura[] = [];
        // Poucas faturas por cartão: uma página basta, com ou sem paginação na resposta.
        for (const fatura of lista(await consultar(`/bills?accountId=${encodeURIComponent(contaId)}&pageSize=50`, apiKey)).slice(0, 50)) {
            const vencimento = dia(fatura?.dueDate), total = numero(fatura?.totalAmount);
            if (!vencimento || total === null) continue;
            const pagamentos = (Array.isArray(fatura.payments) ? fatura.payments : []).filter((pagamento: any) => numero(pagamento?.amount) !== null).slice(0, 20)
                .map((pagamento: any) => ({ data: dia(pagamento.paymentDate), valor: pagamento.amount, tipo: texto(pagamento.valueType, 30) }));
            faturas.push({ ref: typeof fatura.id === 'string' ? referencia(chave, 'fatura', fatura.id) : undefined, vencimento, total, minimo: numero(fatura.minimumPaymentAmount), pagamentos });
        }
        return faturas.sort((a, b) => b.vencimento.localeCompare(a.vencimento)).slice(0, 6);
    } catch {
        return null;
    }
}

/**
 * Quanto de cada fatura foi pago. O PicPay (Open Finance) lista na própria fatura os pagamentos dela; se a fatura
 * mais recente ainda não tem pagamento listado, soma os pagamentos de fatura lançados no cartão desde 25 dias antes do vencimento.
 */
export function situacaoDasFaturas(faturas: Fatura[], lancamentosDoCartao: Lancamento[], hoje = new Date().toISOString().slice(0, 10)): void {
    const centavos = (valor: number) => Math.round(Math.abs(valor) * 100);
    const pagamentoFatura = (item: Lancamento) => item.operacao === 'PAGAMENTO_FATURA' || /credit card payment/i.test(item.categoria || '');
    faturas.forEach((fatura, indice) => {
        let pago = fatura.pagamentos.reduce((soma, item) => soma + centavos(item.valor), 0);
        if (!pago && indice === 0) {
            const desde = new Date(Date.parse(`${fatura.vencimento}T12:00:00Z`) - 25 * 86400000).toISOString().slice(0, 10);
            pago = lancamentosDoCartao.filter(item => pagamentoFatura(item) && item.data >= desde).reduce((soma, item) => soma + centavos(item.valor), 0);
        }
        const total = centavos(fatura.total);
        fatura.pago = pago / 100;
        fatura.situacao = total === 0 || pago >= total - 1 ? 'paga' : pago > 0 ? 'parcial' : fatura.vencimento < hoje ? 'vencida' : 'em_aberto';
    });
}

/**
 * O banco não informa o fechamento: entre a última compra da fatura N e a primeira da N+1 está o dia em que N fechou.
 * Devolve o intervalo de "dias antes do vencimento" compatível com todas as faturas, ou null sem dados suficientes.
 */
export function estimarCiclo(faturas: Fatura[], lancamentosDoCartao: Lancamento[]): Ciclo | null {
    const diaNumero = (data: string) => Math.floor(Date.parse(`${data}T12:00:00Z`) / 86400000);
    const compras = new Map<string, number[]>();
    for (const item of lancamentosDoCartao) {
        if (item.tipo !== 'DEBIT' || !item.faturaRef || item.parcela) continue;
        compras.set(item.faturaRef, [...(compras.get(item.faturaRef) || []), diaNumero(item.data)]);
    }
    const ordenadas = faturas.filter(fatura => fatura.ref && compras.get(fatura.ref)?.length).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    let minimo = 0, maximo = 45;
    let pares = 0;
    for (let i = 0; i + 1 < ordenadas.length; i++) {
        const atual = ordenadas[i], seguinte = ordenadas[i + 1];
        const vencimento = diaNumero(atual.vencimento);
        const ultima = Math.max(...compras.get(atual.ref!)!), primeira = Math.min(...compras.get(seguinte.ref!)!);
        if (primeira <= ultima) continue;
        // Fechamento entre a última compra de N (inclusive) e a véspera da primeira de N+1.
        minimo = Math.max(minimo, vencimento - (primeira - 1));
        maximo = Math.min(maximo, vencimento - ultima);
        pares++;
    }
    return pares && minimo <= maximo ? { diasAntesDoVencimento: [minimo, maximo] } : null;
}

// O item do Meu Pluggy não diz o banco; o nome sai das contas (ex.: "PICPAY INSTITUIÇÃO…", "CAIXA").
const BANCOS: [RegExp, string][] = [[/pic\s*pay/i, 'PicPay'], [/caixa/i, 'Caixa'], [/nu\s*bank|nu pagamentos/i, 'Nubank'], [/ita[uú]/i, 'Itaú'], [/bradesco/i, 'Bradesco'], [/santander/i, 'Santander'], [/\binter\b/i, 'Inter'], [/banco do brasil|\bbb\b/i, 'Banco do Brasil'], [/\bc6\b/i, 'C6'], [/mercado\s*pago/i, 'Mercado Pago'], [/sicoob/i, 'Sicoob'], [/sicredi/i, 'Sicredi']];
export function nomeDoBanco(nomesDasContas: string[]): string {
    const texto = nomesDasContas.join(' ');
    const conhecido = BANCOS.find(([padrao]) => padrao.test(texto));
    if (conhecido) return conhecido[1];
    const palavra = (nomesDasContas[0] || 'Banco').split(/\s+/)[0];
    return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
}

type DadosItem = { item: Item; contas: Conta[]; lancamentos: Lancamento[]; investimentos: Investimento[] };

async function buscarItem(config: Configuracao, itemId: string, apiKey: string, limites: { contas: number; lancamentos: number }): Promise<DadosItem | 'desatualizado'> {
    const item = await consultar(`/items/${itemId}`, apiKey);
    if (item?.connector?.id !== 200 || item?.id !== itemId) throw new Error('A conexão não pertence ao MeuPluggy');
    if (item.consentExpiresAt && Date.parse(item.consentExpiresAt) <= Date.now()) throw new Error('Autorização MeuPluggy expirada');
    if (item.status !== 'UPDATED') return 'desatualizado';
    const itemRef = referencia(config.chave, 'item', itemId);

    const contas: Conta[] = [];
    const lancamentos: Lancamento[] = [];
    for (const conta of await paginado(`/accounts?itemId=${encodeURIComponent(itemId)}`, apiKey, 20, 'Paginação de contas inválida')) {
        if (limites.contas + contas.length >= 20 || typeof conta.id !== 'string' || conta.itemId !== itemId || !['BANK', 'CREDIT'].includes(conta.type) || !Number.isFinite(conta.balance)) {
            throw new Error('Dados de conta inválidos');
        }
        const contaRef = referencia(config.chave, 'conta', conta.id);
        const registro: Conta = { ref: contaRef, itemRef, tipo: conta.type, nome: String(conta.name || 'Conta').slice(0, 100), saldo: conta.balance, moeda: String(conta.currencyCode || 'BRL').slice(0, 3) };
        if (conta.type === 'CREDIT') {
            const credito = conta.creditData || {};
            registro.cartao = { limite: numero(credito.creditLimit), disponivel: numero(credito.availableCreditLimit), fechamento: dia(credito.balanceCloseDate), vencimento: dia(credito.balanceDueDate), minimo: numero(credito.minimumPayment) };
        }
        if (registro.cartao) registro.cartao.faturas = await faturasDoCartao(conta.id, apiKey, config.chave);
        contas.push(registro);
        let proxima: string | null = `?accountId=${encodeURIComponent(conta.id)}`;
        let paginasTransacoes = 0;
        const visitadas = new Set<string>();
        while (proxima !== null) {
            if (++paginasTransacoes > 100 || visitadas.has(proxima) || !proxima.startsWith('?accountId=')) throw new Error('Paginação de transações inválida');
            visitadas.add(proxima);
            const respostaTransacoes = await consultar(`/v2/transactions${proxima}`, apiKey);
            for (const transacao of lista(respostaTransacoes)) {
                if (limites.lancamentos + lancamentos.length >= 25000 || typeof transacao.id !== 'string' || transacao.accountId !== conta.id || !Number.isFinite(transacao.amount) || !['CREDIT', 'DEBIT'].includes(transacao.type) || !['PENDING', 'POSTED'].includes(transacao.status) || Number.isNaN(Date.parse(transacao.date))) {
                    throw new Error('Dados de transação inválidos');
                }
                const meta = transacao.creditCardMetadata;
                const parcela = meta && Number.isInteger(meta.installmentNumber) && Number.isInteger(meta.totalInstallments) && meta.totalInstallments > 1
                    ? { numero: meta.installmentNumber, total: meta.totalInstallments, compra: dia(meta.purchaseDate) } : null;
                lancamentos.push({
                    ref: referencia(config.chave, 'transacao', transacao.id), contaRef,
                    data: String(transacao.date).slice(0, 10), descricao: String(transacao.description || '').slice(0, 300),
                    valor: transacao.amount, tipo: transacao.type, status: transacao.status,
                    moeda: String(transacao.currencyCode || 'BRL').slice(0, 3),
                    // Sem pagador, recebedor nem documentos: só a classificação do banco e o canal.
                    operacao: texto(transacao.operationType, 40), meio: texto(transacao.paymentData?.paymentMethod, 20),
                    categoria: texto(transacao.category, 60), parcela,
                    contraparte: parte(transacao.type === 'CREDIT' ? transacao.paymentData?.payer : transacao.paymentData?.receiver),
                    faturaRef: typeof meta?.billId === 'string' && meta.billId ? referencia(config.chave, 'fatura', meta.billId) : null,
                    mesmoTitular: (() => { const pagador = documento(transacao.paymentData?.payer), recebedor = documento(transacao.paymentData?.receiver); return pagador && recebedor ? pagador === recebedor : null; })()
                });
            }
            const seguinte = respostaTransacoes.next;
            if (seguinte !== null && (typeof seguinte !== 'string' || !seguinte.startsWith('?accountId=') || !seguinte.includes(encodeURIComponent(conta.id)))) {
                throw new Error('Cursor de transações inválido');
            }
            proxima = seguinte;
        }
        if (registro.cartao?.faturas) {
            const doCartao = lancamentos.filter(item => item.contaRef === contaRef);
            situacaoDasFaturas(registro.cartao.faturas, doCartao);
            registro.cartao.ciclo = estimarCiclo(registro.cartao.faturas, doCartao);
        }
    }

    // Investimentos: a documentação do Meu Pluggy não garante que venham; a falta deles não derruba a sincronização.
    const investimentos: Investimento[] = [];
    let investimentosDisponiveis = true;
    try {
        for (const investimento of await paginado(`/investments?itemId=${encodeURIComponent(itemId)}`, apiKey, 20, 'Paginação de investimentos inválida')) {
            if (investimentos.length >= 200 || typeof investimento.id !== 'string' || investimento.itemId !== itemId || !Number.isFinite(investimento.balance)) throw new Error('Dados de investimento inválidos');
            investimentos.push({
                ref: referencia(config.chave, 'investimento', investimento.id), itemRef,
                nome: String(investimento.name || 'Investimento').slice(0, 100), tipo: texto(investimento.type, 30) || 'OTHER',
                subtipo: texto(investimento.subtype, 40), saldo: investimento.balance, moeda: String(investimento.currencyCode || 'BRL').slice(0, 3)
            });
        }
    } catch {
        investimentos.length = 0;
        investimentosDisponiveis = false;
    }
    return { item: { ref: itemRef, banco: nomeDoBanco(contas.map(conta => conta.nome)), status: 'UPDATED', consentimentoExpiraEm: dia(item.consentExpiresAt), desatualizado: false, investimentosDisponiveis }, contas, lancamentos, investimentos };
}

async function buscarVisao(config: Configuracao, anterior: VisaoPluggy | null): Promise<VisaoPluggy> {
    const apiKey = await obterChaveApi(config);
    const visao: Required<VisaoPluggy> = { versao: 2, atualizadoEm: new Date().toISOString(), origem: 'MeuPluggy', itens: [], contas: [], lancamentos: [], investimentos: [] };
    for (const itemId of config.itemIds) {
        const dados = await buscarItem(config, itemId, apiKey, { contas: visao.contas.length, lancamentos: visao.lancamentos.length });
        if (dados === 'desatualizado') {
            // Banco fora do ar ou atualizando: mantém o que a sincronização anterior trouxe desse banco.
            const itemRef = referencia(config.chave, 'item', itemId);
            const contasAntigas = (anterior?.contas || []).filter(conta => conta.itemRef === itemRef);
            const refs = new Set(contasAntigas.map(conta => conta.ref));
            visao.itens.push({ ...(anterior?.itens || []).find(item => item.ref === itemRef) || { ref: itemRef, status: 'OUTDATED', consentimentoExpiraEm: null, investimentosDisponiveis: false }, desatualizado: true });
            visao.contas.push(...contasAntigas);
            visao.lancamentos.push(...(anterior?.lancamentos || []).filter(lancamento => refs.has(lancamento.contaRef)));
            visao.investimentos.push(...(anterior?.investimentos || []).filter(investimento => investimento.itemRef === itemRef));
            continue;
        }
        visao.itens.push(dados.item);
        visao.contas.push(...dados.contas);
        visao.lancamentos.push(...dados.lancamentos);
        visao.investimentos.push(...dados.investimentos);
    }
    if (visao.contas.length === 0) throw new Error('Nenhuma conta disponível; armazenamento anterior preservado');
    return visao;
}

/** Contagens sem dados pessoais: mostram o que o banco preenche, para calibrar as regras de receitas e despesas. */
export function resumoSincronizacao(visao: VisaoPluggy): string {
    const contar = (valores: (string | null | undefined)[]) => Object.entries(valores.reduce<Record<string, number>>((total, valor) => { const chave = valor || '(vazio)'; total[chave] = (total[chave] || 0) + 1; return total; }, {})).sort((a, b) => b[1] - a[1]).map(([chave, n]) => `${chave} ${n}`).join(', ');
    const lancamentos = visao.lancamentos;
    return [
        `Conexões: ${visao.itens?.length ?? 1} (${(visao.itens || []).filter(item => item.desatualizado).length} com dados anteriores)`,
        `Contas: ${contar(visao.contas.map(conta => conta.tipo))}`,
        `Lançamentos: ${lancamentos.length}; com categoria: ${lancamentos.filter(item => item.categoria).length}; parcelados: ${lancamentos.filter(item => item.parcela).length}`,
        `Operações: ${contar(lancamentos.map(item => item.operacao))}`,
        `Meios: ${contar(lancamentos.map(item => item.meio))}`,
        `Com outra parte identificada: ${lancamentos.filter(item => item.contraparte).length}`,
        `Mesmo titular: sim ${lancamentos.filter(item => item.mesmoTitular === true).length}, não ${lancamentos.filter(item => item.mesmoTitular === false).length}, sem dados ${lancamentos.filter(item => item.mesmoTitular == null).length}`,
        `Faturas: ${visao.contas.filter(conta => conta.cartao).map(conta => conta.cartao!.faturas == null ? 'indisponíveis' : conta.cartao!.faturas.length).join(', ') || 'sem cartão'}`,
        `Compras com fatura: ${visao.lancamentos.filter(item => item.faturaRef).length}; ciclo: ${visao.contas.filter(conta => conta.cartao).map(conta => conta.cartao!.ciclo ? conta.cartao!.ciclo.diasAntesDoVencimento.join('–') + ' dias antes do vencimento' : 'sem estimativa').join(', ') || 'sem cartão'}`,
        `Investimentos: ${visao.investimentos?.length ?? 0}${(visao.itens || []).some(item => !item.investimentosDisponiveis) ? ' (indisponíveis em alguma conexão)' : ''}`
    ].join('\n');
}

export async function sincronizarPluggy(): Promise<VisaoPluggy> {
    if (sincronizacao) return sincronizacao;
    sincronizacao = (async () => {
        const config = await configuracaoSync();
        let anterior: VisaoPluggy | null = null;
        try { anterior = await lerVisaoPluggy(); } catch { anterior = null; }
        const visao = await buscarVisao(config, anterior);
        await salvarCifrado(config.arquivo, criptografar(visao, config.chave, config.usuario));
        return visao;
    })();
    try { return await sincronizacao; } finally { sincronizacao = null; }
}

export async function lerVisaoPluggy(): Promise<VisaoPluggy | null> {
    const config = await configuracaoLeitura();
    const cifrado = await lerCifrado(config.arquivo);
    return cifrado ? descriptografar(cifrado, config.chave, config.usuario) as VisaoPluggy : null;
}
