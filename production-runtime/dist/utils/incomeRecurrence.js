"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeIncomeRecurrence = normalizeIncomeRecurrence;
exports.incomeOccursInMonth = incomeOccursInMonth;
exports.getIncomeOccurrenceDate = getIncomeOccurrenceDate;
function normalizeIncomeRecurrence(value) {
    return value === 'monthly' || value === 'yearly' ? value : 'specific';
}
function parseIncomeDate(value) {
    const match = String(value || '').split('T')[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match)
        return null;
    return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}
function incomeOccursInMonth(income, month, year) {
    const start = parseIncomeDate(income?.date);
    if (!start)
        return false;
    const recurrence = normalizeIncomeRecurrence(income?.recurrence);
    const targetKey = year * 12 + month;
    const startKey = start.year * 12 + start.month;
    if (targetKey < startKey)
        return false;
    if (recurrence === 'monthly')
        return true;
    if (recurrence === 'yearly')
        return start.month === month;
    return start.year === year && start.month === month;
}
function getIncomeOccurrenceDate(income, month, year) {
    const start = parseIncomeDate(income?.date) || { year, month, day: 1 };
    const lastDay = new Date(year, month, 0).getDate();
    return new Date(year, month - 1, Math.min(start.day, lastDay));
}
//# sourceMappingURL=incomeRecurrence.js.map