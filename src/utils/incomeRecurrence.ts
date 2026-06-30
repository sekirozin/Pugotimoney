export type IncomeRecurrence = 'specific' | 'monthly' | 'yearly';

export function normalizeIncomeRecurrence(value: unknown): IncomeRecurrence {
    return value === 'monthly' || value === 'yearly' ? value : 'specific';
}

function parseIncomeDate(value: unknown): { year: number; month: number; day: number } | null {
    const match = String(value || '').split('T')[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function incomeOccursInMonth(income: any, month: number, year: number): boolean {
    const start = parseIncomeDate(income?.date);
    if (!start) return false;
    const recurrence = normalizeIncomeRecurrence(income?.recurrence);
    const targetKey = year * 12 + month;
    const startKey = start.year * 12 + start.month;
    if (targetKey < startKey) return false;
    if (recurrence === 'monthly') return true;
    if (recurrence === 'yearly') return start.month === month;
    return start.year === year && start.month === month;
}

export function getIncomeOccurrenceDate(income: any, month: number, year: number): Date {
    const start = parseIncomeDate(income?.date) || { year, month, day: 1 };
    const lastDay = new Date(year, month, 0).getDate();
    return new Date(year, month - 1, Math.min(start.day, lastDay));
}
