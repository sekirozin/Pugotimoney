import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { database } from '../models/database';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const name = file.originalname.toLowerCase();
        const allowedMimeTypes = ['text/csv', 'application/csv', 'application/pdf'];
        if (allowedMimeTypes.includes(file.mimetype) || name.endsWith('.csv') || name.endsWith('.pdf')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos CSV ou PDF são suportados'));
        }
    }
});

export const uploadMiddleware = upload.single('file');

type ProcessStatementOptions = {
    forceType?: 'income' | 'expense';
    paymentMethod?: string;
    creditCardId?: number;
    userId?: number;
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'Alimentação': ['ifood', 'uber eats', 'rappi', 'mcdonalds', 'burger king', 'pizza', 'restaurante', 'lanchonete', 'mercado', 'supermercado', 'padaria', 'açougue', 'hortifruti', 'feira', 'alelo', 'swile', 'vr', 'refeicao'],
    'Transporte': ['uber', '99', 'cabify', 'gasolina', 'posto', 'estacionamento', 'pedagio', 'onibus', 'metro', 'trem', 'taxi', '99pop', 'uberx'],
    'Moradia': ['aluguel', 'condominio', 'iptu', 'luz', 'energia', 'agua', 'gas', 'manutencao', 'reparo'],
    'Saúde': ['farmacia', 'drogaria', 'hospital', 'clinica', 'consulta', 'exame', 'plano de saude', 'unimed', 'amil', 'bradesco saude'],
    'Lazer': ['cinema', 'teatro', 'show', 'evento', 'parque', 'streaming', 'jogo', 'game', 'steam', 'playstation', 'xbox'],
    'Educação': ['curso', 'livro', 'udemy', 'alura', 'coursera', 'faculdade', 'escola', 'material escolar'],
    'Telecomunicações': ['vivo', 'claro', 'tim', 'oi', 'internet', 'telefone', 'plano de dados', 'fibra'],
    'Serviços': ['seguro', 'banco', 'taxa', 'tarifa', 'comissao', 'servico', 'manutencao'],
    'Compras': ['amazon', 'mercadolivre', 'shopee', 'magazine luiza', 'casas bahia', 'americanas', 'submarino', 'extra', 'carrefour', 'loja', 'compra'],
    'Assinatura': ['netflix', 'spotify', 'disney', 'hbo', 'prime video', 'youtube premium', 'chatgpt', 'gamepass', 'iptv', 'assinatura']
};

function detectCategory(description: string): string {
    const desc = description.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            if (desc.includes(keyword.toLowerCase())) {
                return category;
            }
        }
    }
    return 'Outros';
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    const delimiter = line.includes(';') && !line.includes(',') ? ';' : ',';
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseDate(dateStr: string): string {
    const cleaned = dateStr.replace(/"/g, '').trim();
    const portugueseDate = parsePortugueseDate(cleaned);
    if (portugueseDate) return portugueseDate;
    
    if (cleaned.includes('/')) {
        const parts = cleaned.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            return `${year}-${month}-${day}`;
        }
    }
    
    if (cleaned.includes('-')) {
        return cleaned.substring(0, 10);
    }
    
    return new Date().toISOString().split('T')[0];
}

function parsePortugueseDate(value: string): string | null {
    const months: Record<string, string> = {
        janeiro: '01',
        fevereiro: '02',
        março: '03',
        marco: '03',
        abril: '04',
        maio: '05',
        junho: '06',
        julho: '07',
        agosto: '08',
        setembro: '09',
        outubro: '10',
        novembro: '11',
        dezembro: '12'
    };
    const normalized = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const match = normalized.match(/\b(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+)?(\d{4})\b/);
    if (!match) return null;
    const month = months[match[2]];
    if (!month) return null;
    return `${match[3]}-${month}-${match[1].padStart(2, '0')}`;
}

function recoverAmountFromMangled(amountStr: string): string | null {
    const mangled = amountStr.trim();
    if (!mangled) return null;

    const patterns: [RegExp, (m: RegExpExecArray) => string][] = [
        [/R\s*[.,]\s*(\d{1,3})[.,](\d{2})$/m, (m) => `${m[1]}.${m[2]}`],
        [/R\.\s*(\d+)[.,](\d{2})$/m, (m) => `${m[1]}.${m[2]}`],
        [/R\s+[.,]\s*(\d{2})$/m, (m) => `0.${m[1]}`],
        [/[+-]\s*R\s+[.,]\s*(\d{2})$/m, (m) => `0.${m[1]}`],
        [/[+-]\s*R\.\s*(\d{2})$/m, (m) => `0.${m[1]}`],
        [/R\s*(\d+)[.,](\d{2})$/m, (m) => `${m[1]}.${m[2]}`],
    ];

    for (const [re, fmt] of patterns) {
        const m = re.exec(mangled);
        if (m) {
            const recovered = fmt(m);
            if (!isNaN(parseFloat(recovered))) return recovered;
        }
    }

    const digitFallback = mangled.replace(/[^0-9.,]/g, '');
    if (digitFallback && !isNaN(parseFloat(digitFallback.replace(',', '.')))) {
        const lastComma = digitFallback.lastIndexOf(',');
        const lastDot = digitFallback.lastIndexOf('.');
        if (lastComma > lastDot) {
            return digitFallback.replace(/\./g, '').replace(',', '.');
        }
        return digitFallback.replace(',', '.');
    }

    return null;
}

function parseAmount(amountStr: string): number | null {
    let cleaned = amountStr
        .replace(/−/g, '-')
        .replace(/["R$\s]/g, '')
        .replace(/[()]/g, match => match === '(' ? '-' : '')
        .trim();

    cleaned = cleaned.replace(/\)$/, '');
    if (!cleaned || cleaned === '-' || cleaned === ',') {
        const recovered = recoverAmountFromMangled(amountStr);
        if (recovered) {
            const parsed = parseFloat(recovered);
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    }
    
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        cleaned = cleaned.replace(/,/g, '');
    } else {
        cleaned = cleaned.replace(',', '.');
    }

    const parsed = parseFloat(cleaned);
    if (Number.isFinite(parsed)) return parsed;

    const recovered = recoverAmountFromMangled(amountStr);
    if (recovered) {
        const parsed2 = parseFloat(recovered);
        return Number.isFinite(parsed2) ? parsed2 : null;
    }

    return null;
}

function inferTransactionType(amount: number, line: string): 'income' | 'expense' {
    if (amount < 0) return 'expense';

    const normalized = line
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const expenseWords = [
        'debito', 'pagamento', 'compra', 'pix enviado', 'pix realizado',
        'boleto', 'tarifa', 'taxa', 'saque', 'transferencia enviada'
    ];
    const incomeWords = [
        'credito', 'recebido', 'deposito', 'salario', 'ted recebida',
        'doc recebida', 'pix recebido', 'transferencia recebida'
    ];

    if (expenseWords.some(word => normalized.includes(word))) return 'expense';
    if (incomeWords.some(word => normalized.includes(word))) return 'income';
    return 'income';
}

function looksLikeHeader(line: string): boolean {
    const lower = line.toLowerCase();
    return [
        'hora tipo valor',
        'extrato de conta',
        'saldo ao final',
        'saldo final',
        'documento emitido',
        'dúvidas?',
        'duvidas?',
        'picpay serviços',
        'picpay servicos',
        'cnpj:',
        'cpf:',
        'agência:',
        'agencia:',
        'origem / destino'
    ].some(word => lower.includes(word));
}

function cleanStatementDescription(value: string): string {
    return value
        .replace(/\bCom saldo\b/gi, '')
        .replace(/\bCom cartão\b/gi, '')
        .replace(/\bCom cartao\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function isPageNoise(line: string): boolean {
    return /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)
        || /^\d+\s+de\s+\d+/.test(line)
        || /^\d{2}\/\d{2}\/\d{4}/.test(line)
        || looksLikeHeader(line);
}

function parseStatementLines(lines: string[]): any[] {
    if (lines.length < 2) {
        console.error('[Import] Texto extraído insuficiente. Linhas:', lines);
        throw new Error('Extrato deve conter pelo menos 2 linhas. Verifique se o PDF tem texto selecionável (não imagem escaneada).');
    }
    
    const transactions: any[] = [];
    let currentDate: string | null = null;
    let pending: { date: string; kind: string; amount: number; parts: string[]; line: string } | null = null;

    const finalizePending = () => {
        if (!pending) return;
        const description = cleanStatementDescription(pending.parts.join(' ')) || pending.kind;
        const type = inferTransactionType(pending.amount, `${pending.kind} ${description} ${pending.line}`);
        transactions.push({
            type,
            amount: Math.abs(pending.amount),
            category: detectCategory(description),
            description,
            date: pending.date,
            payment_method: /cart[aã]o/i.test(pending.line) ? 'credito' : 'pix'
        });
        pending = null;
    };
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;

        if (/\bCPF:/.test(lines[i + 1] || '')) continue;

        const headerDate = parsePortugueseDate(line);
        if (headerDate) {
            finalizePending();
            currentDate = headerDate;
            continue;
        }

        if (isPageNoise(line)) continue;

        const pdfTransactionMatch = line.match(/^(\d{2}:\d{2})\s+(.+?)\s+([+−-]?\s*(?:R?\$?)?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|[+−-]?\s*(?:R?\$?)?\s*\d+[.,]\d{2}|[+−-]?\s*R\s*[.,]\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*(.*)$/);
        if (currentDate && pdfTransactionMatch) {
            finalizePending();
            const amount = parseAmount(pdfTransactionMatch[3]);
            if (amount !== null && amount !== 0) {
                const kind = cleanStatementDescription(pdfTransactionMatch[2]);
                const description = cleanStatementDescription(pdfTransactionMatch[4]);
                pending = {
                    date: currentDate,
                    kind,
                    amount,
                    parts: description ? [`${kind} - ${description}`] : [kind],
                    line
                };
            }
            continue;
        }

        if (pending) {
            pending.parts.push(line);
            pending.line = `${pending.line} ${line}`;
            continue;
        }
        
        const columns = line.includes(';') || line.includes(',') ? parseCSVLine(line) : line.split(/\s{2,}|\t/).filter(Boolean);
        if (columns.length < 2) continue;
        
        let date: string | null = null;
        let description: string | null = null;
        let amount: number | null = null;
        const descriptionParts: string[] = [];
        
        for (const col of columns) {
            const cleaned = col.replace(/"/g, '').trim();
            const dateMatch = cleaned.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}-\d{1,2}-\d{1,2}\b/);
            
            if (!date && dateMatch) {
                date = parseDate(dateMatch[0]);
                continue;
            }
            
            const amountMatch = cleaned.match(/-?\(?R?\$?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\)?|-?\(?R?\$?\s*\d+[.,]\d{2}\)?/);
            if (amount === null && amountMatch) {
                const parsed = parseAmount(cleaned);
                if (parsed !== null && parsed !== 0) {
                    amount = parsed;
                    continue;
                }
            }

            if (cleaned.length > 2 && !/saldo|total|lan[çc]amentos?/i.test(cleaned)) {
                descriptionParts.push(cleaned);
            }
        }

        description = descriptionParts.join(' ').replace(/\s+/g, ' ').trim() || null;
        
        if (date && description && amount !== null && amount !== 0) {
            const type = inferTransactionType(amount, line);
            const absAmount = Math.abs(amount);
            const category = detectCategory(description);
            
            transactions.push({
                type,
                amount: absAmount,
                category,
                description,
                date,
                payment_method: 'pix'
            });
        }
    }

    finalizePending();

    return transactions;
}

function recoverPDFText(text: string): string {
    let recovered = text;

    recovered = recovered.replace(
        /\b([+-]?\s*?)R\s*[.,]\s*(\d{2})\b/g,
        (_, sign, cents) => `${sign}R$0.${cents}`
    );

    recovered = recovered.replace(
        /\b([+-]?\s*?)R\s*[.,]\s*[.,]\s*(\d{2})\b/g,
        (_, sign, cents) => `${sign}R$0.${cents}`
    );

    recovered = recovered.replace(
        /\b([+-]?\s*?)R(\d{1,3})[.,](\d{2})\b/g,
        (_, sign, reais, cents) => `${sign}R$${reais}.${cents}`
    );

    recovered = recovered.replace(
        /\b([+-]?\s*?)R[.,](\d{3})[.,](\d{2})\b/g,
        (_, sign, intPart, cents) => `${sign}R$${intPart}.${cents}`
    );

    recovered = recovered.replace(
        /\bR\s+(\d{1,3}(?:[.,]\d{2,3})?)\b/g,
        'R$$$1'
    );

    recovered = recovered.replace(
        /\b([+-]?\s*?)R\s+(\d+)\b/g,
        (_, sign, val) => `${sign}R$${val}`
    );

    return recovered;
}

async function extractStatementText(buffer: Buffer, mimeType?: string, filename?: string): Promise<string> {
    const name = filename?.toLowerCase() || '';
    if (mimeType === 'application/pdf' || name.endsWith('.pdf')) {
        const parser = new PDFParse({ data: buffer });
        const parsed = await parser.getText();
        await parser.destroy();
        if (!parsed.text.trim()) {
            throw new Error('PDF não contém texto legível. Envie PDF com texto selecionável, não imagem escaneada.');
        }
        return recoverPDFText(parsed.text);
    }

    const content = buffer.toString('utf-8');
    if (content.length > 1 * 1024 * 1024) {
        throw new Error('CSV muito grande (máximo 1MB)');
    }
    return content;
}

function transactionKey(transaction: any): string {
    return [
        transaction.date,
        transaction.type,
        Number(transaction.amount).toFixed(2),
        String(transaction.description).toLowerCase().trim()
    ].join('|');
}

export async function processStatement(buffer: Buffer, mimeType?: string, filename?: string, options: ProcessStatementOptions = {}): Promise<{ imported: number; skipped: number; transactions: any[]; recognized: number }> {
    const content = await extractStatementText(buffer, mimeType, filename);
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

    if (process.env.NODE_ENV === 'development') {
        console.log('[Import] Linhas extraídas:', lines.length);
        console.log('[Import] Primeiras 10 linhas:', lines.slice(0, 10).join('\n'));
    }

    const transactions = parseStatementLines(lines).map(transaction => ({
        ...transaction,
        type: options.forceType || transaction.type,
        payment_method: options.paymentMethod || transaction.payment_method,
        credit_card_id: options.creditCardId || transaction.credit_card_id || null
    }));

    if (transactions.length === 0) {
        throw new Error('Nenhuma transação reconhecida no extrato');
    }
    
    const existingTransactions = await database.getTransactions(undefined, options.userId);
    const existingKeys = new Set(existingTransactions.map(transactionKey));
    const newTransactions = transactions.filter(transaction => !existingKeys.has(transactionKey(transaction)));

    for (const transaction of newTransactions) {
        await database.addTransaction(transaction, options.userId);
    }
    
    return {
        imported: newTransactions.length,
        skipped: transactions.length - newTransactions.length,
        recognized: transactions.length,
        transactions: newTransactions
    };
}

export async function previewStatement(buffer: Buffer, mimeType?: string, filename?: string): Promise<{ recognized: number; transactions: any[] }> {
    const content = await extractStatementText(buffer, mimeType, filename);
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const transactions = parseStatementLines(lines);
    return { recognized: transactions.length, transactions };
}
