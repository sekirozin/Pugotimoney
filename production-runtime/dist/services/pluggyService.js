"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluggyAtivo = pluggyAtivo;
exports.usuarioPluggy = usuarioPluggy;
exports.situacaoDasFaturas = situacaoDasFaturas;
exports.estimarCiclo = estimarCiclo;
exports.nomeDoBanco = nomeDoBanco;
exports.resumoSincronizacao = resumoSincronizacao;
exports.sincronizarPluggy = sincronizarPluggy;
exports.lerVisaoPluggy = lerVisaoPluggy;
const node_crypto_1 = require("node:crypto");
const node_path_1 = __importDefault(require("node:path"));
const pluggyVault_1 = require("./pluggyVault");
const API = 'https://api.pluggy.ai';
/** O Meu Pluggy gratuito permite até 5 conexões. */
const MAX_ITENS = 5;
let chaveApi = null;
let sincronizacao = null;
function pluggyAtivo() { return process.env.PLUGGY_ENABLED === '1'; }
function usuarioPluggy() { return process.env.PLUGGY_OWNER_USERNAME || ''; }
async function configuracaoLeitura() {
    if (!pluggyAtivo())
        throw new Error('Integração Pluggy desativada');
    const usuario = usuarioPluggy();
    const chaveArquivo = process.env.PLUGGY_DATA_KEY_FILE;
    const arquivo = process.env.PLUGGY_SNAPSHOT_PATH;
    if (!usuario || !chaveArquivo || !arquivo || !node_path_1.default.isAbsolute(chaveArquivo) || !node_path_1.default.isAbsolute(arquivo)) {
        throw new Error('Configuração Pluggy incompleta');
    }
    const chaveTexto = await (0, pluggyVault_1.lerSegredo)(node_path_1.default.dirname(chaveArquivo), node_path_1.default.basename(chaveArquivo));
    return { usuario, chave: (0, pluggyVault_1.lerChave)(chaveTexto), arquivo };
}
async function configuracaoSync() {
    const leitura = await configuracaoLeitura();
    const diretorio = process.env.PLUGGY_SYNC_SECRET_DIR;
    if (!diretorio || !node_path_1.default.isAbsolute(diretorio))
        throw new Error('Segredos de sincronização ausentes');
    const [itens, clientId, clientSecret] = await Promise.all([
        (0, pluggyVault_1.lerSegredo)(diretorio, 'item_id'), (0, pluggyVault_1.lerSegredo)(diretorio, 'client_id'),
        (0, pluggyVault_1.lerSegredo)(diretorio, 'client_secret')
    ]);
    // Um itemId por linha: cada banco autorizado no Meu Pluggy é uma conexão própria.
    const itemIds = [...new Set(itens.split(/\s+/).filter(Boolean))];
    if (!itemIds.length || itemIds.length > MAX_ITENS || itemIds.some(id => !/^[0-9a-f-]{36}$/i.test(id)))
        throw new Error('Identificador de conexão inválido');
    return { ...leitura, itemIds, clientId, clientSecret };
}
async function respostaJson(url, opcoes) {
    const destino = new URL(url);
    if (destino.origin !== API)
        throw new Error('Destino da API não permitido');
    const resposta = await fetch(destino, { ...opcoes, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!resposta.ok)
        throw new Error(`Pluggy indisponível (${resposta.status})`);
    const tamanho = Number(resposta.headers.get('content-length') || 0);
    if (tamanho > 8 * 1024 * 1024)
        throw new Error('Resposta Pluggy acima do limite');
    if (!resposta.body)
        throw new Error('Resposta Pluggy vazia');
    const leitor = resposta.body.getReader();
    const partes = [];
    let bytes = 0;
    while (true) {
        const { done, value } = await leitor.read();
        if (done)
            break;
        bytes += value.byteLength;
        if (bytes > 8 * 1024 * 1024) {
            await leitor.cancel();
            throw new Error('Resposta Pluggy acima do limite');
        }
        partes.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(partes, bytes).toString('utf8'));
}
async function obterChaveApi(config) {
    if (chaveApi && Date.now() < chaveApi.expiraEm)
        return chaveApi.valor;
    const dados = await respostaJson(`${API}/auth`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: config.clientId, clientSecret: config.clientSecret })
    });
    if (typeof dados.apiKey !== 'string' || !dados.apiKey)
        throw new Error('Autenticação Pluggy inválida');
    chaveApi = { valor: dados.apiKey, expiraEm: Date.now() + 105 * 60 * 1000 };
    return chaveApi.valor;
}
function referencia(chave, tipo, id) {
    const chaveReferencias = (0, node_crypto_1.hkdfSync)('sha256', chave, Buffer.alloc(0), 'pugotimoney-pluggy-referencias-v1', 32);
    return (0, node_crypto_1.createHmac)('sha256', Buffer.from(chaveReferencias)).update(`${tipo}:${id}`).digest('hex').slice(0, 32);
}
function lista(valor) {
    if (!valor || typeof valor !== 'object' || !Array.isArray(valor.results))
        throw new Error('Formato Pluggy inesperado');
    return valor.results;
}
async function consultar(caminho, apiKey) {
    return respostaJson(`${API}${caminho}`, { method: 'GET', headers: { 'X-API-KEY': apiKey } });
}
// Campos opcionais: só texto curto ou número finito; o resto vira null.
const texto = (valor, limite) => typeof valor === 'string' && valor.trim() ? valor.trim().slice(0, limite) : null;
const numero = (valor) => typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
// Nome da outra parte; PF/PJ pelo tamanho do documento (11 ou 14 dígitos), sem guardar o número.
const parte = (dados) => {
    const nome = texto(dados?.name, 100);
    if (!nome)
        return null;
    const digitos = documento(dados)?.length;
    return { nome, tipo: digitos === 11 ? 'PF' : digitos === 14 ? 'PJ' : null };
};
// Documento de pagador/recebedor (`paymentData.*.documentNumber`), só dígitos, para comparar na memória.
const documento = (parte) => { const bruto = parte?.documentNumber?.value ?? parte?.documentNumber; return typeof bruto === 'string' && bruto.replace(/\D/g, '').length >= 11 ? bruto.replace(/\D/g, '') : null; };
const dia = (valor) => typeof valor === 'string' && !Number.isNaN(Date.parse(valor)) ? valor.slice(0, 10) : null;
async function paginado(caminho, apiKey, maxPaginas, erro) {
    const registros = [];
    let pagina = 1, totalPaginas = 1;
    do {
        const resposta = await consultar(`${caminho}&page=${pagina}`, apiKey);
        registros.push(...lista(resposta));
        if (!Number.isInteger(resposta.totalPages) || resposta.totalPages > maxPaginas || resposta.totalPages < 0)
            throw new Error(erro);
        totalPaginas = resposta.totalPages;
        pagina++;
    } while (pagina <= totalPaginas);
    return registros;
}
/** Últimas 6 faturas do cartão; `null` quando o banco não as oferece (não derruba a sincronização). */
async function faturasDoCartao(contaId, apiKey, chave) {
    try {
        const faturas = [];
        // Poucas faturas por cartão: uma página basta, com ou sem paginação na resposta.
        for (const fatura of lista(await consultar(`/bills?accountId=${encodeURIComponent(contaId)}&pageSize=50`, apiKey)).slice(0, 50)) {
            const vencimento = dia(fatura?.dueDate), total = numero(fatura?.totalAmount);
            if (!vencimento || total === null)
                continue;
            const pagamentos = (Array.isArray(fatura.payments) ? fatura.payments : []).filter((pagamento) => numero(pagamento?.amount) !== null).slice(0, 20)
                .map((pagamento) => ({ data: dia(pagamento.paymentDate), valor: pagamento.amount, tipo: texto(pagamento.valueType, 30) }));
            faturas.push({ ref: typeof fatura.id === 'string' ? referencia(chave, 'fatura', fatura.id) : undefined, vencimento, total, minimo: numero(fatura.minimumPaymentAmount), pagamentos });
        }
        return faturas.sort((a, b) => b.vencimento.localeCompare(a.vencimento)).slice(0, 6);
    }
    catch {
        return null;
    }
}
/**
 * Quanto de cada fatura foi pago. O PicPay (Open Finance) lista na própria fatura os pagamentos dela; se a fatura
 * mais recente ainda não tem pagamento listado, soma os pagamentos de fatura lançados no cartão desde 25 dias antes do vencimento.
 */
function situacaoDasFaturas(faturas, lancamentosDoCartao, hoje = new Date().toISOString().slice(0, 10)) {
    const centavos = (valor) => Math.round(Math.abs(valor) * 100);
    const pagamentoFatura = (item) => item.operacao === 'PAGAMENTO_FATURA' || /credit card payment/i.test(item.categoria || '');
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
function estimarCiclo(faturas, lancamentosDoCartao) {
    const diaNumero = (data) => Math.floor(Date.parse(`${data}T12:00:00Z`) / 86400000);
    const compras = new Map();
    for (const item of lancamentosDoCartao) {
        if (item.tipo !== 'DEBIT' || !item.faturaRef || item.parcela)
            continue;
        compras.set(item.faturaRef, [...(compras.get(item.faturaRef) || []), diaNumero(item.data)]);
    }
    const ordenadas = faturas.filter(fatura => fatura.ref && compras.get(fatura.ref)?.length).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    let minimo = 0, maximo = 45;
    let pares = 0;
    for (let i = 0; i + 1 < ordenadas.length; i++) {
        const atual = ordenadas[i], seguinte = ordenadas[i + 1];
        const vencimento = diaNumero(atual.vencimento);
        const ultima = Math.max(...compras.get(atual.ref)), primeira = Math.min(...compras.get(seguinte.ref));
        if (primeira <= ultima)
            continue;
        // Fechamento entre a última compra de N (inclusive) e a véspera da primeira de N+1.
        minimo = Math.max(minimo, vencimento - (primeira - 1));
        maximo = Math.min(maximo, vencimento - ultima);
        pares++;
    }
    return pares && minimo <= maximo ? { diasAntesDoVencimento: [minimo, maximo] } : null;
}
// O item do Meu Pluggy não diz o banco; o nome sai das contas (ex.: "PICPAY INSTITUIÇÃO…", "CAIXA").
const BANCOS = [[/pic\s*pay/i, 'PicPay'], [/caixa/i, 'Caixa'], [/nu\s*bank|nu pagamentos/i, 'Nubank'], [/ita[uú]/i, 'Itaú'], [/bradesco/i, 'Bradesco'], [/santander/i, 'Santander'], [/\binter\b/i, 'Inter'], [/banco do brasil|\bbb\b/i, 'Banco do Brasil'], [/\bc6\b/i, 'C6'], [/mercado\s*pago/i, 'Mercado Pago'], [/sicoob/i, 'Sicoob'], [/sicredi/i, 'Sicredi']];
function nomeDoBanco(nomesDasContas) {
    const texto = nomesDasContas.join(' ');
    const conhecido = BANCOS.find(([padrao]) => padrao.test(texto));
    if (conhecido)
        return conhecido[1];
    const palavra = (nomesDasContas[0] || 'Banco').split(/\s+/)[0];
    return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
}
async function buscarItem(config, itemId, apiKey, limites) {
    const item = await consultar(`/items/${itemId}`, apiKey);
    if (item?.connector?.id !== 200 || item?.id !== itemId)
        throw new Error('A conexão não pertence ao MeuPluggy');
    if (item.consentExpiresAt && Date.parse(item.consentExpiresAt) <= Date.now())
        throw new Error('Autorização MeuPluggy expirada');
    if (item.status !== 'UPDATED')
        return 'desatualizado';
    const itemRef = referencia(config.chave, 'item', itemId);
    const contas = [];
    const lancamentos = [];
    for (const conta of await paginado(`/accounts?itemId=${encodeURIComponent(itemId)}`, apiKey, 20, 'Paginação de contas inválida')) {
        if (limites.contas + contas.length >= 20 || typeof conta.id !== 'string' || conta.itemId !== itemId || !['BANK', 'CREDIT'].includes(conta.type) || !Number.isFinite(conta.balance)) {
            throw new Error('Dados de conta inválidos');
        }
        const contaRef = referencia(config.chave, 'conta', conta.id);
        const registro = { ref: contaRef, itemRef, tipo: conta.type, nome: String(conta.name || 'Conta').slice(0, 100), saldo: conta.balance, moeda: String(conta.currencyCode || 'BRL').slice(0, 3) };
        if (conta.type === 'CREDIT') {
            const credito = conta.creditData || {};
            registro.cartao = { limite: numero(credito.creditLimit), disponivel: numero(credito.availableCreditLimit), fechamento: dia(credito.balanceCloseDate), vencimento: dia(credito.balanceDueDate), minimo: numero(credito.minimumPayment) };
        }
        if (registro.cartao)
            registro.cartao.faturas = await faturasDoCartao(conta.id, apiKey, config.chave);
        contas.push(registro);
        let proxima = `?accountId=${encodeURIComponent(conta.id)}`;
        let paginasTransacoes = 0;
        const visitadas = new Set();
        while (proxima !== null) {
            if (++paginasTransacoes > 100 || visitadas.has(proxima) || !proxima.startsWith('?accountId='))
                throw new Error('Paginação de transações inválida');
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
    const investimentos = [];
    let investimentosDisponiveis = true;
    try {
        for (const investimento of await paginado(`/investments?itemId=${encodeURIComponent(itemId)}`, apiKey, 20, 'Paginação de investimentos inválida')) {
            if (investimentos.length >= 200 || typeof investimento.id !== 'string' || investimento.itemId !== itemId || !Number.isFinite(investimento.balance))
                throw new Error('Dados de investimento inválidos');
            investimentos.push({
                ref: referencia(config.chave, 'investimento', investimento.id), itemRef,
                nome: String(investimento.name || 'Investimento').slice(0, 100), tipo: texto(investimento.type, 30) || 'OTHER',
                subtipo: texto(investimento.subtype, 40), saldo: investimento.balance, moeda: String(investimento.currencyCode || 'BRL').slice(0, 3)
            });
        }
    }
    catch {
        investimentos.length = 0;
        investimentosDisponiveis = false;
    }
    return { item: { ref: itemRef, banco: nomeDoBanco(contas.map(conta => conta.nome)), status: 'UPDATED', consentimentoExpiraEm: dia(item.consentExpiresAt), desatualizado: false, investimentosDisponiveis }, contas, lancamentos, investimentos };
}
async function buscarVisao(config, anterior) {
    const apiKey = await obterChaveApi(config);
    const visao = { versao: 2, atualizadoEm: new Date().toISOString(), origem: 'MeuPluggy', itens: [], contas: [], lancamentos: [], investimentos: [] };
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
    if (visao.contas.length === 0)
        throw new Error('Nenhuma conta disponível; armazenamento anterior preservado');
    return visao;
}
/** Contagens sem dados pessoais: mostram o que o banco preenche, para calibrar as regras de receitas e despesas. */
function resumoSincronizacao(visao) {
    const contar = (valores) => Object.entries(valores.reduce((total, valor) => { const chave = valor || '(vazio)'; total[chave] = (total[chave] || 0) + 1; return total; }, {})).sort((a, b) => b[1] - a[1]).map(([chave, n]) => `${chave} ${n}`).join(', ');
    const lancamentos = visao.lancamentos;
    return [
        `Conexões: ${visao.itens?.length ?? 1} (${(visao.itens || []).filter(item => item.desatualizado).length} com dados anteriores)`,
        `Contas: ${contar(visao.contas.map(conta => conta.tipo))}`,
        `Lançamentos: ${lancamentos.length}; com categoria: ${lancamentos.filter(item => item.categoria).length}; parcelados: ${lancamentos.filter(item => item.parcela).length}`,
        `Operações: ${contar(lancamentos.map(item => item.operacao))}`,
        `Meios: ${contar(lancamentos.map(item => item.meio))}`,
        `Com outra parte identificada: ${lancamentos.filter(item => item.contraparte).length}`,
        `Mesmo titular: sim ${lancamentos.filter(item => item.mesmoTitular === true).length}, não ${lancamentos.filter(item => item.mesmoTitular === false).length}, sem dados ${lancamentos.filter(item => item.mesmoTitular == null).length}`,
        `Faturas: ${visao.contas.filter(conta => conta.cartao).map(conta => conta.cartao.faturas == null ? 'indisponíveis' : conta.cartao.faturas.length).join(', ') || 'sem cartão'}`,
        `Compras com fatura: ${visao.lancamentos.filter(item => item.faturaRef).length}; ciclo: ${visao.contas.filter(conta => conta.cartao).map(conta => conta.cartao.ciclo ? conta.cartao.ciclo.diasAntesDoVencimento.join('–') + ' dias antes do vencimento' : 'sem estimativa').join(', ') || 'sem cartão'}`,
        `Investimentos: ${visao.investimentos?.length ?? 0}${(visao.itens || []).some(item => !item.investimentosDisponiveis) ? ' (indisponíveis em alguma conexão)' : ''}`
    ].join('\n');
}
async function sincronizarPluggy() {
    if (sincronizacao)
        return sincronizacao;
    sincronizacao = (async () => {
        const config = await configuracaoSync();
        let anterior = null;
        try {
            anterior = await lerVisaoPluggy();
        }
        catch {
            anterior = null;
        }
        const visao = await buscarVisao(config, anterior);
        await (0, pluggyVault_1.salvarCifrado)(config.arquivo, (0, pluggyVault_1.criptografar)(visao, config.chave, config.usuario));
        return visao;
    })();
    try {
        return await sincronizacao;
    }
    finally {
        sincronizacao = null;
    }
}
async function lerVisaoPluggy() {
    const config = await configuracaoLeitura();
    const cifrado = await (0, pluggyVault_1.lerCifrado)(config.arquivo);
    return cifrado ? (0, pluggyVault_1.descriptografar)(cifrado, config.chave, config.usuario) : null;
}
//# sourceMappingURL=pluggyService.js.map