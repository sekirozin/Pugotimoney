"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recurrenceTypes = void 0;
exports.civilDate = civilDate;
exports.todayCivil = todayCivil;
exports.recurrenceDate = recurrenceDate;
exports.recurrenceTypes = ['daily', 'weekly', 'monthly', 'yearly'];
function civilDate(value) {
    if (typeof value !== 'string')
        return null;
    const date = value.split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        return null;
    const parsed = new Date(date + 'T12:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}
function todayCivil() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function recurrenceDate(anchor, recurrence, index) {
    if (!civilDate(anchor) || !exports.recurrenceTypes.includes(recurrence))
        throw new Error('Recorrência inválida.');
    const [year, month, day] = anchor.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    if (recurrence === 'daily' || recurrence === 'weekly')
        date.setUTCDate(day + index * (recurrence === 'weekly' ? 7 : 1));
    else {
        date.setUTCDate(1);
        date.setUTCMonth(month - 1 + index * (recurrence === 'yearly' ? 12 : 1));
        const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
        date.setUTCDate(Math.min(day, last));
    }
    return date.toISOString().slice(0, 10);
}
//# sourceMappingURL=calendar.js.map