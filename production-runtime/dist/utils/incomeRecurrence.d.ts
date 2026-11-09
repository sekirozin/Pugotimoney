export type IncomeRecurrence = 'specific' | 'monthly' | 'yearly';
export declare function normalizeIncomeRecurrence(value: unknown): IncomeRecurrence;
export declare function incomeOccursInMonth(income: any, month: number, year: number): boolean;
export declare function getIncomeOccurrenceDate(income: any, month: number, year: number): Date;
//# sourceMappingURL=incomeRecurrence.d.ts.map