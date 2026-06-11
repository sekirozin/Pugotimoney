export type ReportSection = 'installments' | 'expenses' | 'purchases' | 'shopping' | 'budgets' | 'income' | 'cards' | 'goals';
export declare class ReportService {
    static generateMonthlyStatement(year: number, month: number, sections?: ReportSection[]): Promise<Buffer>;
}
//# sourceMappingURL=reportService.d.ts.map