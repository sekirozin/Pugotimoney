export const recurrenceTypes = ['daily', 'weekly', 'monthly', 'yearly'];
export function civilDate(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const date = value.split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const parsed = new Date(date + 'T12:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}
export function todayCivil(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function recurrenceDate(anchor: string, recurrence: string, index: number): string {
    if (!civilDate(anchor) || !recurrenceTypes.includes(recurrence)) throw new Error('Recorrência inválida.');
    const [year, month, day] = anchor.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    if (recurrence === 'daily' || recurrence === 'weekly') date.setUTCDate(day + index * (recurrence === 'weekly' ? 7 : 1));
    else {
        date.setUTCDate(1);
        date.setUTCMonth(month - 1 + index * (recurrence === 'yearly' ? 12 : 1));
        const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
        date.setUTCDate(Math.min(day, last));
    }
    return date.toISOString().slice(0, 10);
}
