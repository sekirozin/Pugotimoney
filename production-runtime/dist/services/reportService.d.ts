import type { DespesasDoMes, ReceitasDoMes } from './pluggyRegras';
/** Receitas e despesas reais das contas conectadas: substituem as manuais no resumo e nas seções Receitas e Gastos. */
export type RealStatement = {
    receitas: ReceitasDoMes;
    despesas: DespesasDoMes;
};
export type ReportSection = 'installments' | 'expenses' | 'purchases' | 'shopping' | 'budgets' | 'income' | 'cards' | 'goals';
export declare class ReportService {
    static generateMonthlyStatement(year: number, month: number, sections?: ReportSection[], userId?: number, real?: RealStatement): Promise<Buffer>;
}
//# sourceMappingURL=reportService.d.ts.map