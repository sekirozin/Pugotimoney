export declare const finance: {
    cents(value: unknown): number;
    sum(values: number[]): number;
    summary(data: any, year: number, month: number): {
        income: number;
        expenses: number;
        balance: number;
        categoryTotals: Record<string, number>;
        entries: any[];
    };
    budget(data: any, budget: any, year: number, month: number, day?: number): any;
    pluggyCategory(category: string | null): string;
};
export declare function financialData(userId: number): Promise<{
    transactions: any[];
    incomes: any[];
    expenses: any[];
}>;
//# sourceMappingURL=financeService.d.ts.map