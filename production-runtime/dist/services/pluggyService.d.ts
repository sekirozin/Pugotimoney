/** Dados do cartão de crédito vindos do banco (`creditData`). */
type DadosCartao = {
    limite: number | null;
    disponivel: number | null;
    fechamento: string | null;
    vencimento: string | null;
    minimo: number | null;
};
/** Fatura do cartão (Open Finance): pagamentos sem modo nem identificação, só data, valor e tipo (total/mínimo). */
type Fatura = {
    ref?: string;
    vencimento: string;
    total: number;
    minimo: number | null;
    pagamentos: {
        data: string | null;
        valor: number;
        tipo: string | null;
    }[];
    pago?: number;
    situacao?: 'paga' | 'parcial' | 'em_aberto' | 'vencida';
};
/** Fechamento estimado: quantos dias antes do vencimento a fatura fecha (intervalo, das datas das compras de cada fatura). */
type Ciclo = {
    diasAntesDoVencimento: [number, number];
};
type Conta = {
    ref: string;
    itemRef: string;
    tipo: 'BANK' | 'CREDIT';
    nome: string;
    saldo: number;
    moeda: string;
    cartao?: DadosCartao & {
        faturas?: Fatura[] | null;
        ciclo?: Ciclo | null;
    };
};
type Parcela = {
    numero: number;
    total: number;
    compra: string | null;
};
type Lancamento = {
    ref: string;
    contaRef: string;
    data: string;
    descricao: string;
    valor: number;
    tipo: 'CREDIT' | 'DEBIT';
    status: 'PENDING' | 'POSTED';
    moeda: string;
    /** Classificação do banco (`operationType`, ex.: PIX, PAGAMENTO_FATURA, ESTORNO) e canal (`paymentData.paymentMethod`). */
    operacao?: string | null;
    meio?: string | null;
    categoria?: string | null;
    parcela?: Parcela | null;
    /** Pagador e recebedor com o mesmo CPF/CNPJ (transferência entre contas do mesmo titular). Só o resultado é guardado, nunca o documento. */
    mesmoTitular?: boolean | null;
    /** Fatura a que a compra no cartão pertence (`creditCardMetadata.billId`, como referência). */
    faturaRef?: string | null;
    /** Outra parte (pedido do usuário): quem pagou, numa entrada; quem recebeu, numa saída. Só nome e se é pessoa ou empresa, nunca o documento. */
    contraparte?: {
        nome: string;
        tipo: 'PF' | 'PJ' | null;
    } | null;
};
type Investimento = {
    ref: string;
    itemRef: string;
    nome: string;
    tipo: string;
    subtipo: string | null;
    saldo: number;
    moeda: string;
};
/** Uma conexão (um banco autorizado no Meu Pluggy). `desatualizado`: o banco não respondeu e os dados dele são da sincronização anterior. */
type Item = {
    ref: string;
    banco?: string;
    status: string;
    consentimentoExpiraEm: string | null;
    desatualizado: boolean;
    investimentosDisponiveis: boolean;
};
export type VisaoPluggy = {
    versao?: 2;
    atualizadoEm: string;
    origem: 'MeuPluggy';
    itens?: Item[];
    contas: Conta[];
    lancamentos: Lancamento[];
    investimentos?: Investimento[];
};
export declare function pluggyAtivo(): boolean;
export declare function usuarioPluggy(): string;
/**
 * Quanto de cada fatura foi pago. O PicPay (Open Finance) lista na própria fatura os pagamentos dela; se a fatura
 * mais recente ainda não tem pagamento listado, soma os pagamentos de fatura lançados no cartão desde 25 dias antes do vencimento.
 */
export declare function situacaoDasFaturas(faturas: Fatura[], lancamentosDoCartao: Lancamento[], hoje?: string): void;
/**
 * O banco não informa o fechamento: entre a última compra da fatura N e a primeira da N+1 está o dia em que N fechou.
 * Devolve o intervalo de "dias antes do vencimento" compatível com todas as faturas, ou null sem dados suficientes.
 */
export declare function estimarCiclo(faturas: Fatura[], lancamentosDoCartao: Lancamento[]): Ciclo | null;
export declare function nomeDoBanco(nomesDasContas: string[]): string;
/** Contagens sem dados pessoais: mostram o que o banco preenche, para calibrar as regras de receitas e despesas. */
export declare function resumoSincronizacao(visao: VisaoPluggy): string;
export declare function sincronizarPluggy(): Promise<VisaoPluggy>;
export declare function lerVisaoPluggy(): Promise<VisaoPluggy | null>;
export {};
//# sourceMappingURL=pluggyService.d.ts.map