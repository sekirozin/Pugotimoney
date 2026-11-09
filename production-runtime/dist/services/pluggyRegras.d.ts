import type { VisaoPluggy } from './pluggyService';
type Lancamento = VisaoPluggy['lancamentos'][number];
export type Receita = {
    data: string;
    descricao: string;
    valor: number;
    conta: string;
    categoria: string | null;
    contraparte: string | null;
};
export type ReceitasDoMes = {
    total: number;
    lancamentos: Receita[];
    /** Entradas que não são receita: transferência entre contas próprias, resgate de investimento, pagamento de fatura e lançamento pendente. */
    ignorados: {
        transferencias: number;
        investimentos: number;
        outros: number;
        pendentes: number;
    };
};
export declare function contraparteDe(item: Lancamento): {
    nome: string;
    tipo: 'PF' | 'PJ' | null;
} | null;
/** Receita do mês = dinheiro que entrou nas contas correntes conectadas, sem contar movimento entre contas próprias. */
/** `bancos`: refs dos itens a mostrar (sem filtro, todos). O pareamento de transferências sempre usa todas as contas. */
export declare function receitasDoMes(visao: VisaoPluggy, ano: number, mes: number, bancos?: Set<string>): ReceitasDoMes;
export type LancamentoDoMes = {
    ref: string;
    data: string;
    descricao: string;
    valor: number;
    tipo: 'CREDIT' | 'DEBIT';
    pendente: boolean;
    conta: string;
    contaRef: string;
    contaTipo: 'BANK' | 'CREDIT';
    bancoRef: string | null;
    categoria: string | null;
    parcela: {
        numero: number;
        total: number;
    } | null;
    /** Entre contas do mesmo titular (categoria, mesmo documento ou par entre contas conectadas). */
    transferenciaPropria: boolean;
    pagamentoFatura: boolean;
    /** Aplicação (saída) ou resgate (entrada) de investimento: dinheiro que continua sendo seu. */
    investimento: boolean;
    /** Forma de pagamento: Crédito, Débito, Pix, TED, DOC, Boleto, Salário, Rendimento ou Outros. */
    forma: string;
    /** Quem pagou (entrada) ou quem recebeu (saída), quando o banco informa. */
    contraparte: {
        nome: string;
        tipo: 'PF' | 'PJ' | null;
    } | null;
};
/** Forma de pagamento a partir da conta (cartão de crédito), do canal (`paymentData.paymentMethod`) e da operação do banco. */
export declare function formaDePagamento(item: Lancamento, contaTipo: 'BANK' | 'CREDIT'): string;
/** Lançamentos reais de um período (datas inclusivas; sem limite, todo o histórico), classificados com as regras das receitas. `contaRef` limita a uma conta ou cartão. */
export declare function lancamentosNoPeriodo(visao: VisaoPluggy, de: string | null, ate: string | null, bancos?: Set<string>, contaRef?: string): LancamentoDoMes[];
export type Despesa = {
    data: string;
    descricao: string;
    valor: number;
    conta: string;
    categoria: string | null;
    forma: string;
    contraparte: string | null;
    parcela: {
        numero: number;
        total: number;
    } | null;
    pendente: boolean;
};
export type DespesasDoMes = {
    total: number;
    lancamentos: Despesa[];
    /** Saídas que não são despesa: transferência entre contas próprias, aplicação em investimento e pagamento de fatura (as compras já contam no cartão). */
    ignorados: {
        transferencias: number;
        investimentos: number;
        faturas: number;
    };
    /** Quantas das despesas ainda estão pendentes no banco (já entram no total, como na aba Transações). */
    pendentes: number;
};
/** Despesas do mês = saídas das contas e compras no cartão, com as mesmas regras da aba Transações. */
export declare function despesasDoMes(visao: VisaoPluggy, ano: number, mes: number, bancos?: Set<string>): DespesasDoMes;
/** sem-dados: o mês está fora do histórico (antes do primeiro lançamento ou depois do último); parcial: falta parte do mês ou o histórico do cartão. */
export type SituacaoDoMes = 'completo' | 'parcial' | 'sem-dados';
export type Relatorio = {
    meses: {
        mes: number;
        receitas: number;
        despesas: number;
        situacao: SituacaoDoMes;
    }[];
    /** Primeiro e último dia com lançamentos (contas e cartões dos bancos escolhidos) e primeiro dia com lançamentos de cartão. */
    cobertura: {
        inicio: string | null;
        fim: string | null;
        inicioCartao: string | null;
    };
    /** Do mês escolhido: despesas por categoria e para quem foi / de quem veio mais dinheiro. */
    categorias: {
        categoria: string | null;
        total: number;
        quantidade: number;
    }[];
    destinos: {
        nome: string;
        total: number;
        quantidade: number;
    }[];
    origens: {
        nome: string;
        total: number;
        quantidade: number;
    }[];
};
export declare function relatorioDoAno(visao: VisaoPluggy, ano: number, mes: number, bancos?: Set<string>): Relatorio;
export {};
//# sourceMappingURL=pluggyRegras.d.ts.map