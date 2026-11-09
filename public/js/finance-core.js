/* Shared financial rules: browser and server execute this same module. */
(function(root, factory) {
    const core = factory();
    if (typeof module === 'object' && module.exports) module.exports = core;
    else root.FinanceCore = core;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    function cents(value) {
        const amount = Number(value);
        const result = Math.round((amount + Number.EPSILON) * 100);
        if (!Number.isFinite(amount) || !Number.isSafeInteger(result)) throw new Error('Valor monetário inválido.');
        return result;
    }
    function sum(values) { const total = values.reduce((n, value) => n + cents(value), 0); if (!Number.isSafeInteger(total)) throw new Error('Total excede o limite.'); return total / 100; }
    function money(value) { return new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(Number(value || 0)); }
    function validDate(value) {
        const text = String(value || '').split('T')[0];
        const date = new Date(text + 'T12:00:00Z');
        return /^\d{4}-\d{2}-\d{2}$/.test(text) && Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === text ? text : null;
    }
    function entries(data, year, month) {
        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('Período inválido.');
        const prefix = `${year}-${String(month).padStart(2,'0')}`;
        const result = (data.transactions || []).filter(t => validDate(t.date)?.startsWith(prefix)).map(t => ({...t, date:validDate(t.date), amount:cents(t.amount)/100, source:'transaction'}));
        for (const [key,type] of [['incomes','income'],['expenses','expense']]) {
            for (const record of data[key] || []) {
                const date = validDate(record.date); if (!date) continue;
                const [y,m,d] = date.split('-').map(Number);
                if (year*12+month < y*12+m) continue;
                const rec = record.recurrence || 'specific';
                if (rec === 'yearly' && m !== month) continue;
                if (!['monthly','yearly'].includes(rec) && (y !== year || m !== month)) continue;
                const lastDay = new Date(Date.UTC(year,month,0)).getUTCDate();
                result.push({...record,type,amount:cents(record.amount)/100,date:`${prefix}-${String(Math.min(d,lastDay)).padStart(2,'0')}`,source:key});
            }
        }
        return result;
    }
    function summary(data, year, month) {
        const rows = entries(data,year,month);
        const income = sum(rows.filter(r=>r.type==='income').map(r=>r.amount));
        const expenses = sum(rows.filter(r=>r.type==='expense').map(r=>r.amount));
        const categories = {};
        for (const row of rows.filter(r=>r.type==='expense')) categories[row.category] = sum([categories[row.category] || 0,row.amount]);
        return {income,expenses,balance:sum([income,-expenses]),categoryTotals:categories,entries:rows};
    }
    function budget(data, item, year, month, referenceDay) {
        let rows;
        if (item.period === 'yearly') rows=Array.from({length:12},(_,i)=>entries(data,year,i+1)).flat();
        else if (item.period === 'weekly') {
            const end=new Date(Date.UTC(year,month-1,referenceDay || new Date(Date.UTC(year,month,0)).getUTCDate(),12));
            const start=new Date(end);start.setUTCDate(end.getUTCDate()-((end.getUTCDay()+6)%7));
            end.setTime(start.getTime());end.setUTCDate(start.getUTCDate()+6);
            rows=entries(data,start.getUTCFullYear(),start.getUTCMonth()+1);
            if(start.getUTCMonth()!==end.getUTCMonth() || start.getUTCFullYear()!==end.getUTCFullYear()) rows.push(...entries(data,end.getUTCFullYear(),end.getUTCMonth()+1));
            rows=rows.filter(r=>r.date>=start.toISOString().slice(0,10) && r.date<=end.toISOString().slice(0,10));
        } else rows=entries(data,year,month);
        const spent=sum(rows.filter(r=>r.type==='expense' && r.category===item.category).map(r=>r.amount));
        const amount=cents(item.amount)/100;
        const percentage=amount>0 ? spent/amount*100 : 0;
        return {...item,spent,remaining:sum([amount,-spent]),percentage,status:percentage>100?'over':percentage>80?'warning':'within'};
    }
    // Categorias da Pluggy (inglês) em português; as desconhecidas aparecem como vieram.
    const PLUGGY_CATEGORIES = {
        'Transfer - PIX': 'Pix', 'Transfers': 'Transferências', 'Same person transfer': 'Entre suas contas', 'Third party transfer - PIX': 'Pix de terceiros',
        'Transfer - Bank Slip': 'Boleto', 'Transfer - TED': 'TED', 'Telecommunications': 'Telecomunicações', 'Taxi and ride-hailing': 'Táxi e apps de transporte',
        'Shopping': 'Compras', 'Online shopping': 'Compras online', 'Eating out': 'Restaurantes', 'Groceries': 'Mercado', 'Services': 'Serviços',
        'Digital services': 'Serviços digitais', 'Video streaming': 'Streaming', 'Gambling': 'Apostas', 'Credit card payment': 'Pagamento de fatura',
        'Late payment and overdraft costs': 'Juros e multas por atraso', 'Interests charged': 'Juros', 'Tax on financial operations': 'IOF',
        'Investments': 'Investimentos', 'Insurance': 'Seguros', 'Electronics': 'Eletrônicos', 'Gas stations': 'Combustível', 'Internet': 'Internet',
        'Education': 'Educação', 'Salary': 'Salário', 'Proceeds interests and dividends': 'Rendimentos', 'Health': 'Saúde', 'Pharmacy': 'Farmácia',
        'Housing': 'Moradia', 'Rent': 'Aluguel', 'Utilities': 'Contas da casa', 'Entertainment': 'Lazer', 'Travel': 'Viagens', 'Pets': 'Pets'
    };
    function pluggyCategory(category) { return category ? (PLUGGY_CATEGORIES[category] || category) : 'Sem categoria'; }
    return {cents,sum,money,validDate,entries,summary,budget,pluggyCategory};
});
