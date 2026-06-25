import PDFDocument from 'pdfkit';
import { database } from '../models/database';

export type ReportSection = 'installments' | 'expenses' | 'purchases' | 'shopping' | 'budgets' | 'income' | 'cards' | 'goals';

const DEFAULT_SECTIONS: ReportSection[] = ['installments', 'expenses', 'purchases', 'shopping', 'budgets', 'income', 'cards', 'goals'];
type PdfDoc = InstanceType<typeof PDFDocument>;
type TableColumn = { header: string; key: string; width: number; align?: 'left' | 'right' | 'center' };

function formatCurrency(value: number): string {
    return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

function formatDate(value: string): string {
    const [year, month, day] = (value || '').split('T')[0].split('-');
    return year && month && day ? `${day}/${month}/${year}` : value || '';
}

function formatDateObject(value: Date): string {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
}

function parseInstallmentAmounts(installment: any): number[] {
    const raw = installment?.installmentAmounts ?? installment?.installment_amounts;
    if (Array.isArray(raw)) return raw.map(Number).filter(amount => Number.isFinite(amount) && amount >= 0);
    if (typeof raw === 'string' && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map(Number).filter(amount => Number.isFinite(amount) && amount >= 0);
        } catch (error) {
            return [];
        }
    }
    return [];
}

function getInstallmentAmountAt(installment: any, index: number): number {
    const amounts = parseInstallmentAmounts(installment);
    const customAmount = amounts[index];
    if (Number.isFinite(customAmount)) return customAmount;
    return Number(installment?.installmentAmount ?? installment?.installment_amount ?? 0);
}

function getInstallmentDateAt(installment: any, index: number): Date {
    const startDate = new Date((installment.startDate || installment.start_date || '').split('T')[0] + 'T00:00:00');
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + index);
    return date;
}

function getInstallmentEntryForMonth(installment: any, month: number, year: number) {
    const totalInstallments = Number(installment.totalInstallments || installment.total_installments || 0);
    const paidInstallments = Math.max(0, Math.min(Number(installment.currentInstallment ?? installment.current_installment ?? 0), totalInstallments));

    for (let index = 0; index < totalInstallments; index++) {
        const installmentDate = getInstallmentDateAt(installment, index);
        if (installmentDate.getMonth() + 1 !== month || installmentDate.getFullYear() !== year) continue;

        return {
            index,
            amount: getInstallmentAmountAt(installment, index),
            isPaid: index < paidInstallments,
            totalInstallments,
            paidInstallments
        };
    }

    return null;
}

function addSectionTitle(doc: PdfDoc, title: string, subtitle?: string) {
    if (doc.y > 650) doc.addPage();
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(15).fillColor('#111827').text(title);
    if (subtitle) {
        doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text(subtitle);
    }
    doc.moveDown(0.5);
}

function ensureSpace(doc: PdfDoc, neededHeight: number) {
    if (doc.y + neededHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
    }
}

function drawTable(doc: PdfDoc, columns: TableColumn[], rows: Record<string, any>[]) {
    const tableX = doc.page.margins.left;
    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
    const bottomY = () => doc.page.height - doc.page.margins.bottom;

    const drawHeader = () => {
        ensureSpace(doc, 28);
        const y = doc.y;
        doc.rect(tableX, y, tableWidth, 22).fill('#111827');
        let x = tableX;
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
        columns.forEach(col => {
            doc.text(col.header, x + 6, y + 7, {
                width: col.width - 12,
                align: col.align || 'left',
                lineBreak: false
            });
            x += col.width;
        });
        doc.y = y + 22;
    };

    drawHeader();

    rows.forEach((row, index) => {
        doc.font('Helvetica').fontSize(8);
        const cellHeights = columns.map(col => {
            const value = String(row[col.key] ?? '');
            return doc.heightOfString(value, {
                width: col.width - 12,
                align: col.align || 'left'
            });
        });
        const rowHeight = Math.max(24, Math.max(...cellHeights) + 12);

        if (doc.y + rowHeight > bottomY()) {
            doc.addPage();
            drawHeader();
        }

        const y = doc.y;
        doc.rect(tableX, y, tableWidth, rowHeight).fill(index % 2 === 0 ? '#ffffff' : '#f9fafb');
        doc.rect(tableX, y, tableWidth, rowHeight).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

        let x = tableX;
        columns.forEach(col => {
            doc.font('Helvetica').fontSize(8).fillColor('#111827');
            doc.text(String(row[col.key] ?? ''), x + 6, y + 6, {
                width: col.width - 12,
                align: col.align || 'left'
            });
            x += col.width;
        });

        doc.y = y + rowHeight;
    });

    doc.moveDown(0.6);
}

function addTotal(doc: PdfDoc, label: string, value: number) {
    ensureSpace(doc, 24);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827')
        .text(`${label}: ${formatCurrency(value)}`, { align: 'right' });
    doc.moveDown(0.5);
}

export class ReportService {
    static async generateMonthlyStatement(year: number, month: number, sections: ReportSection[] = DEFAULT_SECTIONS, userId?: number): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const selectedSections = new Set(sections.length > 0 ? sections : DEFAULT_SECTIONS);
                const transactions = await database.getTransactions(undefined, userId);
                const installments = await database.getInstallments(userId);
                const creditCards = await database.getCreditCards(userId);
                const budgets = await database.getBudgets(userId);
                const goals = await database.getFinancialGoals(userId);
                const shoppingItems = await database.getShoppingItems(userId);

                const monthStr = String(month).padStart(2, '0');
                const startOfMonth = `${year}-${monthStr}-01`;
                const endOfMonthDate = new Date(year, month, 0);
                const endOfMonth = `${year}-${monthStr}-${String(endOfMonthDate.getDate()).padStart(2, '0')}`;

                const monthlyTransactions = transactions.filter(t => {
                    const dateStr = t.date.split('T')[0];
                    return dateStr >= startOfMonth && dateStr <= endOfMonth;
                });

                const monthlyIncome = monthlyTransactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);

                const monthlyExpenses = monthlyTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);

                const monthlyInstallmentEntries = installments
                    .map(i => ({ installment: i, entry: getInstallmentEntryForMonth(i, month, year) }))
                    .filter((item): item is { installment: any; entry: NonNullable<ReturnType<typeof getInstallmentEntryForMonth>> } => Boolean(item.entry));

                const monthlyInstallments = monthlyInstallmentEntries
                    .filter(({ entry }) => !entry.isPaid)
                    .reduce((sum, { entry }) => sum + entry.amount, 0);

                const monthNames = [
                    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                ];

                const doc = new PDFDocument({ size: 'A4', margin: 42 });
                const chunks: Buffer[] = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                doc.rect(0, 0, doc.page.width, 92).fill('#111827');
                doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('Relatório Financeiro', 42, 28);
                doc.fontSize(11).font('Helvetica').fillColor('#d1d5db').text(`${monthNames[month - 1]} de ${year}`, 42, 56);
                doc.y = 116;

                const balance = monthlyIncome - monthlyExpenses - monthlyInstallments;
                const onlyInstallmentsSelected = selectedSections.size === 1 && selectedSections.has('installments');
                let hasBodyContent = false;

                if (!onlyInstallmentsSelected) {
                    addSectionTitle(doc, 'Resumo Financeiro');
                    drawTable(doc, [
                        { header: 'Receitas', key: 'income', width: 125, align: 'right' },
                        { header: 'Gastos', key: 'expenses', width: 125, align: 'right' },
                        { header: 'Parcelamentos', key: 'installments', width: 125, align: 'right' },
                        { header: 'Saldo', key: 'balance', width: 135, align: 'right' }
                    ], [{
                        income: formatCurrency(monthlyIncome),
                        expenses: formatCurrency(monthlyExpenses),
                        installments: formatCurrency(monthlyInstallments),
                        balance: formatCurrency(balance)
                    }]);
                    doc.moveDown(1);
                    hasBodyContent = true;
                }

                // Income transactions
                const incomeTx = monthlyTransactions.filter(t => t.type === 'income');
                if (selectedSections.has('income') && incomeTx.length > 0) {
                    if (hasBodyContent) doc.addPage();
                    hasBodyContent = true;
                    addSectionTitle(doc, 'Receitas', 'Cada linha representa uma transação reconhecida no período.');
                    drawTable(doc, [
                        { header: 'Data', key: 'date', width: 70 },
                        { header: 'Descrição', key: 'description', width: 245 },
                        { header: 'Categoria', key: 'category', width: 105 },
                        { header: 'Valor', key: 'amount', width: 90, align: 'right' }
                    ], incomeTx.map(t => ({
                        date: formatDate(t.date),
                        description: t.description,
                        category: t.category,
                        amount: formatCurrency(t.amount)
                    })));
                    addTotal(doc, 'Total Receitas', monthlyIncome);
                }

                // Expense transactions
                const expenseTx = monthlyTransactions.filter(t => t.type === 'expense');
                if (selectedSections.has('expenses') && expenseTx.length > 0) {
                    if (hasBodyContent) doc.addPage();
                    hasBodyContent = true;
                    addSectionTitle(doc, 'Gastos', 'Cada linha representa uma transação reconhecida no período.');
                    drawTable(doc, [
                        { header: 'Data', key: 'date', width: 70 },
                        { header: 'Descrição', key: 'description', width: 245 },
                        { header: 'Categoria', key: 'category', width: 105 },
                        { header: 'Valor', key: 'amount', width: 90, align: 'right' }
                    ], expenseTx.map(t => ({
                        date: formatDate(t.date),
                        description: t.description,
                        category: t.category,
                        amount: formatCurrency(t.amount)
                    })));
                    addTotal(doc, 'Total Gastos', monthlyExpenses);
                }

                // Installments
                if (selectedSections.has('installments') && monthlyInstallmentEntries.length > 0) {
                    if (hasBodyContent) doc.addPage();
                    hasBodyContent = true;
                    addSectionTitle(doc, 'Parcelamentos', 'Lista das parcelas do mês selecionado.');
                    drawTable(doc, [
                        { header: 'Nome', key: 'name', width: 190 },
                        { header: 'Data', key: 'date', width: 75 },
                        { header: 'Valor', key: 'amount', width: 85, align: 'right' },
                        { header: 'Status', key: 'status', width: 70 },
                        { header: 'Parcela atual', key: 'installment', width: 90, align: 'center' }
                    ], monthlyInstallmentEntries.map(({ installment, entry }) => ({
                        name: installment.description,
                        date: formatDateObject(getInstallmentDateAt(installment, entry.index)),
                        amount: formatCurrency(entry.amount),
                        status: entry.isPaid ? 'Pago' : 'Não pago',
                        installment: `${entry.index + 1} de ${entry.totalInstallments}`
                    })));
                    addTotal(doc, 'Total de parcelas não pagas no mês', monthlyInstallments);
                } else if (onlyInstallmentsSelected) {
                    addSectionTitle(doc, 'Parcelamentos', 'Lista das parcelas do mês selecionado.');
                    doc.font('Helvetica').fontSize(10).fillColor('#6b7280')
                        .text('Nenhum parcelamento encontrado para o mês selecionado.');
                    hasBodyContent = true;
                }

                // Credit Cards
                if (selectedSections.has('cards') && creditCards.length > 0) {
                    if (hasBodyContent) doc.addPage();
                    hasBodyContent = true;
                    addSectionTitle(doc, 'Cartões de Crédito');
                    drawTable(doc, [
                        { header: 'Nome', key: 'name', width: 145 },
                        { header: 'Banco', key: 'bank', width: 105 },
                        { header: 'Limite', key: 'limit', width: 90, align: 'right' },
                        { header: 'Saldo', key: 'balance', width: 85, align: 'right' },
                        { header: 'Disponível', key: 'available', width: 85, align: 'right' }
                    ], creditCards.map(c => {
                        const limit = c.creditLimit || c.credit_limit || 0;
                        return {
                            name: c.name,
                            bank: c.bank,
                            limit: formatCurrency(limit),
                            balance: formatCurrency(c.currentBalance),
                            available: formatCurrency(limit - c.currentBalance)
                        };
                    }));
                }

                // Card purchases
                const cardPurchases = monthlyTransactions.filter(t => t.type === 'expense' && (t.payment_method === 'credito' || t.credit_card_id));
                if (selectedSections.has('purchases') && cardPurchases.length > 0) {
                    if (hasBodyContent) doc.addPage();
                    hasBodyContent = true;
                    addSectionTitle(doc, 'Compras no Cartão');
                    drawTable(doc, [
                        { header: 'Data', key: 'date', width: 70 },
                        { header: 'Descrição', key: 'description', width: 245 },
                        { header: 'Categoria', key: 'category', width: 105 },
                        { header: 'Valor', key: 'amount', width: 90, align: 'right' }
                    ], cardPurchases.map(t => ({
                        date: formatDate(t.date),
                        description: t.description,
                        category: t.category,
                        amount: formatCurrency(t.amount)
                    })));
                    const totalPurchases = cardPurchases.reduce((sum, t) => sum + t.amount, 0);
                    addTotal(doc, 'Total Compras', totalPurchases);
                }

                // Budgets
                if (selectedSections.has('budgets') && budgets.length > 0) {
                    if (hasBodyContent) doc.addPage();
                    hasBodyContent = true;
                    addSectionTitle(doc, 'Orçamentos');
                    drawTable(doc, [
                        { header: 'Categoria', key: 'category', width: 210 },
                        { header: 'Orçado', key: 'amount', width: 100, align: 'right' },
                        { header: 'Gasto', key: 'spent', width: 100, align: 'right' },
                        { header: 'Restante', key: 'remaining', width: 100, align: 'right' }
                    ], budgets.map(b => ({
                        category: b.category,
                        amount: formatCurrency(b.amount),
                        spent: formatCurrency(b.spent),
                        remaining: formatCurrency(b.amount - b.spent)
                    })));
                }

                // Shopping List
                if (selectedSections.has('shopping') && shoppingItems.length > 0) {
                    if (hasBodyContent) doc.addPage();
                    hasBodyContent = true;
                    addSectionTitle(doc, 'Lista de Compras');
                    drawTable(doc, [
                        { header: 'Item', key: 'item', width: 300 },
                        { header: 'Preço Est.', key: 'estimatedPrice', width: 110, align: 'right' },
                        { header: 'Status', key: 'status', width: 100 }
                    ], shoppingItems.map(item => ({
                        item: item.item,
                        estimatedPrice: formatCurrency(item.estimatedPrice),
                        status: item.purchased ? 'Comprado' : 'Pendente'
                    })));
                }

                // Financial Goals
                if (selectedSections.has('goals') && goals.length > 0) {
                    if (hasBodyContent) doc.addPage();
                    hasBodyContent = true;
                    addSectionTitle(doc, 'Metas Financeiras');
                    drawTable(doc, [
                        { header: 'Meta', key: 'name', width: 220 },
                        { header: 'Atual', key: 'current', width: 100, align: 'right' },
                        { header: 'Alvo', key: 'target', width: 100, align: 'right' },
                        { header: 'Progresso', key: 'progress', width: 90, align: 'right' }
                    ], goals.map(g => ({
                        name: g.name,
                        current: formatCurrency(g.currentAmount),
                        target: formatCurrency(g.targetAmount),
                        progress: `${g.targetAmount > 0 ? ((g.currentAmount / g.targetAmount) * 100).toFixed(1) : '0.0'}%`
                    })));
                }

                // Footer
                doc.addPage();
                doc.fontSize(12).font('Helvetica').text('Pugotimoney', { align: 'center' });
                doc.fontSize(10).text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, { align: 'center' });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}
