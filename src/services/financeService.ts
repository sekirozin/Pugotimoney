import { database } from '../models/database';
export const finance: {
    cents(value: unknown): number; sum(values: number[]): number;
    summary(data: any, year: number, month: number): {income:number;expenses:number;balance:number;categoryTotals:Record<string,number>;entries:any[]};
    budget(data:any,budget:any,year:number,month:number,day?:number): any;
    pluggyCategory(category: string | null): string;
} = require('../../public/js/finance-core.js');
export async function financialData(userId: number) {
    const [transactions,incomes,expenses] = await Promise.all([database.getTransactions(undefined,userId),database.getIncomes(userId),database.getExpenses(userId)]);
    return {transactions,incomes,expenses};
}
