"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = exports.Database = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
class Database {
    db;
    constructor() {
        const dbPath = path_1.default.join(__dirname, '../../database.sqlite');
        this.db = new sqlite3_1.default.Database(dbPath, (err) => {
            if (err) {
                console.error('Erro ao conectar ao banco de dados:', err);
            }
            else {
                console.log('Conectado ao banco de SQLite');
                this.initializeTables();
            }
        });
    }
    initializeTables() {
        const createTables = () => {
            return new Promise((resolve, reject) => {
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS transactions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
                        amount REAL NOT NULL,
                        category TEXT NOT NULL,
                        description TEXT NOT NULL,
                        date TEXT NOT NULL,
                        payment_method TEXT DEFAULT 'pix',
                        recurrence TEXT,
                        recurrence_end_date TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS shopping_items (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        item TEXT NOT NULL,
                        category TEXT NOT NULL,
                        estimated_price REAL DEFAULT 0,
                        purchased BOOLEAN DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS credit_cards (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        bank TEXT NOT NULL,
                        credit_limit REAL NOT NULL,
                        closing_date TEXT,
                        due_date TEXT,
                        current_balance REAL DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS budgets (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        category TEXT NOT NULL,
                        amount REAL NOT NULL,
                        period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
                        spent REAL DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS installments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        description TEXT NOT NULL,
                        total_amount REAL NOT NULL,
                        installment_amount REAL NOT NULL,
                        total_installments INTEGER NOT NULL,
                        current_installment INTEGER DEFAULT 1,
                        start_date TEXT NOT NULL,
                        category TEXT NOT NULL,
                        credit_card_id INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (credit_card_id) REFERENCES credit_cards (id)
                    );
                    
                    CREATE TABLE IF NOT EXISTS financial_goals (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        target_amount REAL NOT NULL,
                        current_amount REAL DEFAULT 0,
                        target_date TEXT,
                        category TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS incomes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        description TEXT NOT NULL,
                        amount REAL NOT NULL,
                        category TEXT NOT NULL,
                        date TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT NOT NULL UNIQUE,
                        password TEXT NOT NULL,
                        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS categories (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
                        color TEXT DEFAULT '#667eea',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                `, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        };
        createTables()
            .then(async () => {
            await this.runMigrations();
            this.insertDefaultCategories();
        })
            .catch((err) => {
            console.error('Erro ao criar tabelas:', err);
        });
    }
    async runMigrations() {
        const migrations = [
            "ALTER TABLE transactions ADD COLUMN payment_method TEXT DEFAULT 'pix'",
            "ALTER TABLE transactions ADD COLUMN recurrence TEXT",
            "ALTER TABLE transactions ADD COLUMN recurrence_end_date TEXT",
            "ALTER TABLE transactions ADD COLUMN credit_card_id INTEGER REFERENCES credit_cards(id)",
            "ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''",
            "ALTER TABLE users ADD COLUMN location TEXT DEFAULT ''",
            "ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''"
        ];
        for (const sql of migrations) {
            try {
                await this.run(sql);
            }
            catch (e) { /* coluna já existe */ }
        }
    }
    insertDefaultCategories() {
        const defaultCategories = [
            { name: 'Salário', type: 'income', color: '#2ecc71' },
            { name: 'Investimentos', type: 'income', color: '#9b59b6' },
            { name: 'Alimentação', type: 'expense', color: '#e74c3c' },
            { name: 'Transporte', type: 'expense', color: '#3498db' },
            { name: 'Moradia', type: 'expense', color: '#f39c12' },
            { name: 'Saúde', type: 'expense', color: '#1abc9c' },
            { name: 'Lazer', type: 'expense', color: '#e67e22' },
            { name: 'Educação', type: 'expense', color: '#34495e' },
            { name: 'Outros', type: 'expense', color: '#95a5a6' }
        ];
        defaultCategories.forEach(category => {
            this.db.run(`INSERT OR IGNORE INTO categories (name, type, color) VALUES (?, ?, ?)`, [category.name, category.type, category.color]);
        });
    }
    async addTransaction(transaction) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO transactions (type, amount, category, description, date, payment_method, recurrence, recurrence_end_date, credit_card_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(transaction.type, transaction.amount, transaction.category, transaction.description, transaction.date, transaction.payment_method || 'pix', transaction.recurrence || null, transaction.recurrence_end_date || null, transaction.credit_card_id || null, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }
    async getTransactions(filters) {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM transactions';
            const params = [];
            if (filters) {
                const conditions = [];
                if (filters.type) {
                    conditions.push('type = ?');
                    params.push(filters.type);
                }
                if (filters.category) {
                    conditions.push('category = ?');
                    params.push(filters.category);
                }
                if (filters.startDate) {
                    conditions.push('date >= ?');
                    params.push(filters.startDate);
                }
                if (filters.endDate) {
                    conditions.push('date <= ?');
                    params.push(filters.endDate);
                }
                if (conditions.length > 0) {
                    query += ' WHERE ' + conditions.join(' AND ');
                }
            }
            query += ' ORDER BY date DESC';
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    async updateTransaction(id, updates) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE transactions 
                SET type = ?, amount = ?, category = ?, description = ?, date = ?, payment_method = ?, recurrence = ?, recurrence_end_date = ?, credit_card_id = ?
                WHERE id = ?
            `);
            stmt.run(updates.type, updates.amount, updates.category, updates.description, updates.date, updates.payment_method || 'pix', updates.recurrence || null, updates.recurrence_end_date || null, updates.credit_card_id || null, id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async deleteTransaction(id) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('DELETE FROM transactions WHERE id = ?');
            stmt.run(id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async addIncome(income) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO incomes (description, amount, category, date)
                VALUES (?, ?, ?, ?)
            `);
            stmt.run(income.description, income.amount, income.category, income.date, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }
    async getIncomes() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM incomes ORDER BY date DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows.map((row) => ({
                        ...row,
                        id: row.id,
                        description: row.description,
                        amount: row.amount,
                        category: row.category,
                        date: row.date
                    })));
                }
            });
        });
    }
    async updateIncome(id, updates) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE incomes
                SET description = ?, amount = ?, category = ?, date = ?
                WHERE id = ?
            `);
            stmt.run(updates.description, updates.amount, updates.category, updates.date, id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async deleteIncome(id) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('DELETE FROM incomes WHERE id = ?');
            stmt.run(id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async addUser(user) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
            stmt.run(user.username, user.password, user.role, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }
    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row || null);
                }
            });
        });
    }
    async getUserCount() {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row ? row.count : 0);
                }
            });
        });
    }
    async getUserById(id) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT id, username, role, bio, location, avatar_url, created_at FROM users WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row || null);
                }
            });
        });
    }
    async updateProfile(id, data) {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];
            if (data.bio !== undefined) {
                fields.push('bio = ?');
                values.push(data.bio);
            }
            if (data.location !== undefined) {
                fields.push('location = ?');
                values.push(data.location);
            }
            if (data.avatar_url !== undefined) {
                fields.push('avatar_url = ?');
                values.push(data.avatar_url);
            }
            if (fields.length === 0) {
                resolve(false);
                return;
            }
            values.push(id);
            this.db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
        });
    }
    async processRecurringTransactions() {
        const nextDate = (d, rec) => {
            const nd = new Date(d);
            if (rec === 'daily')
                nd.setDate(nd.getDate() + 1);
            else if (rec === 'weekly')
                nd.setDate(nd.getDate() + 7);
            else if (rec === 'monthly')
                nd.setMonth(nd.getMonth() + 1);
            else if (rec === 'yearly')
                nd.setFullYear(nd.getFullYear() + 1);
            return nd;
        };
        const rows = await this.all(`SELECT * FROM transactions WHERE recurrence IS NOT NULL AND recurrence != ''`);
        let created = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (const t of rows) {
            const rec = t.recurrence;
            const endDate = t.recurrence_end_date ? new Date(t.recurrence_end_date + 'T00:00:00') : null;
            let current = new Date(t.date.split('T')[0] + 'T00:00:00');
            let last = new Date(current);
            while (current <= today) {
                const next = nextDate(current, rec);
                if (endDate && next > endDate)
                    break;
                current = next;
            }
            if (current.getTime() === last.getTime())
                continue;
            let gen = new Date(last);
            while (true) {
                const next = nextDate(gen, rec);
                if (next > today)
                    break;
                if (endDate && next > endDate)
                    break;
                const dateStr = next.toISOString().split('T')[0];
                await this.run(`INSERT INTO transactions (type, amount, category, description, date, payment_method) VALUES (?, ?, ?, ?, ?, ?)`, [t.type, t.amount, t.category, t.description, dateStr + 'T12:00:00', t.payment_method || 'pix']);
                created++;
                gen = next;
            }
            const newDateStr = current.toISOString().split('T')[0];
            await this.run(`UPDATE transactions SET date = ? WHERE id = ?`, [newDateStr + 'T12:00:00', t.id]);
        }
        return created;
    }
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async addShoppingItem(item) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO shopping_items (item, category, estimated_price, purchased)
                VALUES (?, ?, ?, ?)
            `);
            stmt.run(item.item, item.category, item.estimatedPrice || item.estimated_price || 0, item.purchased ? 1 : 0, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }
    async getShoppingItems() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM shopping_items ORDER BY created_at DESC', (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows.map((row) => ({
                        ...row,
                        estimatedPrice: row.estimated_price,
                        purchased: row.purchased === 1
                    })));
                }
            });
        });
    }
    async updateShoppingItem(id, updates) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE shopping_items 
                SET item = ?, category = ?, estimated_price = ?, purchased = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            stmt.run(updates.item, updates.category, updates.estimatedPrice || updates.estimated_price, updates.purchased ? 1 : 0, id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async deleteShoppingItem(id) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('DELETE FROM shopping_items WHERE id = ?');
            stmt.run(id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async addCreditCard(card) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO credit_cards (name, bank, credit_limit, closing_date, due_date, current_balance)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run(card.name, card.bank, card.creditLimit || card.credit_limit || 0, card.closingDate || card.closing_date, card.dueDate || card.due_date, card.currentBalance || card.current_balance || 0, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }
    async getCreditCards() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM credit_cards ORDER BY created_at DESC', (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows.map((row) => ({
                        ...row,
                        creditLimit: row.credit_limit,
                        closingDate: row.closing_date,
                        dueDate: row.due_date,
                        currentBalance: row.current_balance
                    })));
                }
            });
        });
    }
    async updateCreditCard(id, updates) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE credit_cards 
                SET name = ?, bank = ?, credit_limit = ?, closing_date = ?, due_date = ?, current_balance = ?
                WHERE id = ?
            `);
            stmt.run(updates.name, updates.bank, updates.creditLimit || updates.credit_limit, updates.closingDate || updates.closing_date, updates.dueDate || updates.due_date, updates.currentBalance || updates.current_balance || 0, id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async deleteCreditCard(id) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('DELETE FROM credit_cards WHERE id = ?');
            stmt.run(id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async addBudget(budget) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO budgets (category, amount, period, spent)
                VALUES (?, ?, ?, ?)
            `);
            stmt.run(budget.category, budget.amount, budget.period, budget.spent || 0, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }
    async getBudgets() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM budgets ORDER BY created_at DESC', (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    async updateBudget(id, updates) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE budgets 
                SET category = ?, amount = ?, period = ?, spent = ?
                WHERE id = ?
            `);
            stmt.run(updates.category, updates.amount, updates.period, updates.spent, id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async deleteBudget(id) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('DELETE FROM budgets WHERE id = ?');
            stmt.run(id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async addInstallment(installment) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO installments (
                    description, total_amount, installment_amount, total_installments,
                    current_installment, start_date, category, credit_card_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(installment.description, installment.totalAmount || installment.total_amount, installment.installmentAmount || installment.installment_amount, installment.totalInstallments || installment.total_installments, installment.currentInstallment || installment.current_installment || 1, installment.startDate || installment.start_date, installment.category, installment.creditCardId || installment.credit_card_id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }
    async getInstallments() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT i.*, c.name as card_name, c.bank as card_bank
                FROM installments i
                LEFT JOIN credit_cards c ON i.credit_card_id = c.id
                ORDER BY i.start_date DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows.map((row) => ({
                        ...row,
                        totalAmount: row.total_amount,
                        installmentAmount: row.installment_amount,
                        totalInstallments: row.total_installments,
                        currentInstallment: row.current_installment,
                        startDate: row.start_date,
                        creditCardId: row.credit_card_id
                    })));
                }
            });
        });
    }
    async updateInstallment(id, updates) {
        return new Promise((resolve, reject) => {
            const description = updates.description;
            const totalAmount = updates.totalAmount ?? updates.total_amount;
            const installmentAmount = updates.installmentAmount ?? updates.installment_amount;
            const totalInstallments = updates.totalInstallments ?? updates.total_installments;
            const currentInstallment = updates.currentInstallment ?? updates.current_installment;
            const category = updates.category;
            const startDate = updates.startDate ?? updates.start_date;
            const creditCardId = updates.creditCardId ?? updates.credit_card_id;
            const stmt = this.db.prepare(`
                UPDATE installments
                SET description = ?,
                    total_amount = ?,
                    installment_amount = ?,
                    total_installments = ?,
                    current_installment = ?,
                    category = ?,
                    start_date = ?,
                    credit_card_id = ?
                WHERE id = ?
            `);
            stmt.run(description, totalAmount, installmentAmount, totalInstallments, currentInstallment, category, startDate, creditCardId, id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async deleteInstallment(id) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('DELETE FROM installments WHERE id = ?');
            stmt.run(id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async processInstallmentAdvancement() {
        const installments = await this.getInstallments();
        const today = new Date();
        let advanced = 0;
        for (const inst of installments) {
            const total = inst.totalInstallments;
            const current = inst.currentInstallment;
            if (current >= total)
                continue;
            const startDate = new Date(inst.startDate.split('T')[0] + 'T00:00:00');
            const monthsSinceStart = (today.getFullYear() - startDate.getFullYear()) * 12
                + (today.getMonth() - startDate.getMonth());
            const expected = Math.min(monthsSinceStart + 1, total);
            if (expected > current) {
                await this.run('UPDATE installments SET current_installment = ? WHERE id = ?', [expected, inst.id]);
                advanced++;
            }
        }
        return advanced;
    }
    async addFinancialGoal(goal) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO financial_goals (name, target_amount, current_amount, target_date, category)
                VALUES (?, ?, ?, ?, ?)
            `);
            stmt.run(goal.name, goal.targetAmount || goal.target_amount || 0, goal.currentAmount || goal.current_amount || 0, goal.targetDate || goal.target_date, goal.category, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }
    async getFinancialGoals() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM financial_goals ORDER BY created_at DESC', (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows.map((row) => ({
                        ...row,
                        targetAmount: row.target_amount,
                        currentAmount: row.current_amount,
                        targetDate: row.target_date
                    })));
                }
            });
        });
    }
    async updateFinancialGoal(id, updates) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE financial_goals 
                SET name = ?, target_amount = ?, current_amount = ?, target_date = ?, category = ?
                WHERE id = ?
            `);
            stmt.run(updates.name, updates.targetAmount || updates.target_amount, updates.currentAmount || updates.current_amount, updates.targetDate || updates.target_date, updates.category, id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async deleteFinancialGoal(id) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('DELETE FROM financial_goals WHERE id = ?');
            stmt.run(id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async getCategories() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM categories ORDER BY name', (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    async addCategory(category) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO categories (name, type, color)
                VALUES (?, ?, ?)
            `);
            stmt.run(category.name, category.type, category.color, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }
    async getCategoryTotals(type) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT category, SUM(amount) as total, COUNT(*) as count
                FROM transactions
            `;
            const params = [];
            if (type && type !== 'all') {
                query += ' WHERE type = ?';
                params.push(type);
            }
            query += ' GROUP BY category ORDER BY total DESC';
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    async getMonthlySummary(year, month) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    type,
                    SUM(amount) as total,
                    COUNT(*) as count
                FROM transactions 
                WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?
                GROUP BY type
            `;
            this.db.all(query, [year.toString(), String(month).padStart(2, '0')], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    const result = { income: 0, expense: 0 };
                    rows.forEach((row) => {
                        result[row.type] = row.total;
                    });
                    resolve(result);
                }
            });
        });
    }
    async updateCategory(id, updates) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE categories 
                SET name = ?, type = ?, color = ?
                WHERE id = ?
            `);
            stmt.run(updates.name, updates.type, updates.color, id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    async deleteCategory(id) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?');
            stmt.run(id, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    }
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Erro ao fechar conexão com o banco de dados:', err);
            }
            else {
                console.log('Conexão com o banco de dados fechada');
            }
        });
    }
}
exports.Database = Database;
exports.database = new Database();
//# sourceMappingURL=database.js.map