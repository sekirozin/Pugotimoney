"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = exports.Database = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const calendar_1 = require("../utils/calendar");
class Database {
    constructor(dbPath = process.env.DATABASE_PATH || path_1.default.join(__dirname, '../../database.sqlite')) {
        this.recurrenceRun = null;
        this.db = new sqlite3_1.default.Database(dbPath);
        this.db.configure('busyTimeout', 5000);
        this.ready = this.initializeTables();
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
                        purchase_url TEXT,
                        sort_order INTEGER DEFAULT 0,
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
                    
                    CREATE TABLE IF NOT EXISTS installment_groups (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        due_day INTEGER CHECK (due_day IS NULL OR (due_day >= 1 AND due_day <= 31)),
                        description TEXT,
                        user_id INTEGER REFERENCES users(id),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, name)
                    );

                    CREATE TABLE IF NOT EXISTS installments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        description TEXT NOT NULL,
                        total_amount REAL NOT NULL,
                        installment_amount REAL NOT NULL,
                        installment_amounts TEXT,
                        total_installments INTEGER NOT NULL,
                        current_installment INTEGER DEFAULT 0,
                        start_date TEXT NOT NULL,
                        category TEXT NOT NULL,
                        credit_card_id INTEGER,
                        installment_group_id INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (credit_card_id) REFERENCES credit_cards (id),
                        FOREIGN KEY (installment_group_id) REFERENCES installment_groups (id)
                    );
                    
                    CREATE TABLE IF NOT EXISTS subscription_groups (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        description TEXT,
                        user_id INTEGER REFERENCES users(id),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, name)
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
                        recurrence TEXT NOT NULL DEFAULT 'specific',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS expenses (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        description TEXT NOT NULL,
                        amount REAL NOT NULL,
                        category TEXT NOT NULL,
                        date TEXT NOT NULL,
                        recurrence TEXT NOT NULL DEFAULT 'specific',
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
        return createTables()
            .then(async () => {
            await this.runMigrations();
            await this.insertDefaultCategories();
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
            "ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''",
            "ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE shopping_items ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE shopping_items ADD COLUMN purchase_url TEXT",
            "ALTER TABLE shopping_items ADD COLUMN sort_order INTEGER DEFAULT 0",
            "ALTER TABLE credit_cards ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE budgets ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE installments ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE installments ADD COLUMN installment_amounts TEXT",
            "CREATE TABLE IF NOT EXISTS installment_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, due_day INTEGER CHECK (due_day IS NULL OR (due_day >= 1 AND due_day <= 31)), description TEXT, user_id INTEGER REFERENCES users(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, name))",
            "ALTER TABLE installments ADD COLUMN installment_group_id INTEGER REFERENCES installment_groups(id)",
            "CREATE TABLE IF NOT EXISTS subscription_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, user_id INTEGER REFERENCES users(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, name))",
            "ALTER TABLE financial_goals ADD COLUMN subscription_group_id INTEGER REFERENCES subscription_groups(id)",
            "ALTER TABLE financial_goals ADD COLUMN payment_day INTEGER CHECK (payment_day IS NULL OR (payment_day >= 1 AND payment_day <= 31))",
            "ALTER TABLE financial_goals ADD COLUMN start_date TEXT",
            "ALTER TABLE financial_goals ADD COLUMN end_date TEXT",
            "ALTER TABLE financial_goals ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE incomes ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE incomes ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'specific'",
            "ALTER TABLE expenses ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE expenses ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'specific'",
            "ALTER TABLE transactions ADD COLUMN recurrence_source_id INTEGER",
            "ALTER TABLE transactions ADD COLUMN occurrence_date TEXT",
            "CREATE TABLE IF NOT EXISTS removed_occurrences (source_id INTEGER NOT NULL, occurrence_date TEXT NOT NULL, PRIMARY KEY(source_id,occurrence_date))",
            "CREATE TRIGGER IF NOT EXISTS remember_removed_occurrence BEFORE DELETE ON transactions WHEN OLD.recurrence_source_id IS NOT NULL BEGIN INSERT OR IGNORE INTO removed_occurrences(source_id,occurrence_date) VALUES(OLD.recurrence_source_id,OLD.occurrence_date); END",
            "CREATE UNIQUE INDEX IF NOT EXISTS transaction_occurrence ON transactions(recurrence_source_id, occurrence_date) WHERE recurrence_source_id IS NOT NULL",
            "CREATE INDEX IF NOT EXISTS transactions_user_date ON transactions(user_id, date)",
            "CREATE INDEX IF NOT EXISTS incomes_user_date ON incomes(user_id, date)",
            "CREATE INDEX IF NOT EXISTS expenses_user_date ON expenses(user_id, date)",
            "ALTER TABLE expenses ADD COLUMN completed_at TEXT"
        ];
        for (const sql of migrations) {
            try {
                await this.run(sql);
            }
            catch (e) {
                if (!String(e).includes('duplicate column name'))
                    throw e;
            }
        }
        // Unowned legacy rows require explicit review; never assign them to the first user.
    }
    async insertDefaultInstallmentGroupsForExistingUsers() {
        const users = await this.all('SELECT id FROM users');
        for (const user of users) {
            await this.insertDefaultInstallmentGroups(user.id);
        }
    }
    async insertDefaultInstallmentGroups(userId) {
        const groups = [
            { name: 'CARTÃO - DIA 10', dueDay: 10, description: 'Parcelamentos agrupados para vencimento no dia 10' },
            { name: 'CARTÃO - DIA 20', dueDay: 20, description: 'Parcelamentos agrupados para vencimento no dia 20' }
        ];
        for (const group of groups) {
            await this.run(`INSERT OR IGNORE INTO installment_groups (name, due_day, description, user_id) VALUES (?, ?, ?, ?)`, [group.name, group.dueDay, group.description, userId]);
        }
    }
    async insertDefaultCategories() {
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
        for (const category of defaultCategories) {
            await this.run(`INSERT INTO categories (name, type, color) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = ? AND type = ?)`, [category.name, category.type, category.color, category.name, category.type]);
        }
    }
    async addTransaction(transaction, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO transactions (type, amount, category, description, date, payment_method, recurrence, recurrence_end_date, credit_card_id, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(transaction.type, transaction.amount, transaction.category, transaction.description, transaction.date, transaction.payment_method || 'pix', transaction.recurrence || null, transaction.recurrence_end_date || null, transaction.credit_card_id || null, userId || transaction.user_id || null, function (err) {
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
    async getTransactions(filters, userId) {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM transactions';
            const params = [];
            const conditions = [];
            if (userId !== undefined) {
                conditions.push('user_id = ?');
                params.push(userId);
            }
            if (filters) {
                if (filters.id) {
                    conditions.push('id = ?');
                    params.push(filters.id);
                }
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
                if (filters.minAmount !== undefined) {
                    conditions.push('amount >= ?');
                    params.push(filters.minAmount);
                }
                if (filters.maxAmount !== undefined) {
                    conditions.push('amount <= ?');
                    params.push(filters.maxAmount);
                }
                if (filters.endDate) {
                    conditions.push('date <= ?');
                    params.push(filters.endDate);
                }
            }
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            query += ' ORDER BY date DESC, id DESC';
            if (filters?.limit !== undefined) {
                query += ' LIMIT ? OFFSET ?';
                params.push(filters.limit, filters.offset || 0);
            }
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
    async updateTransaction(id, updates, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE transactions 
                SET type = ?, amount = ?, category = ?, description = ?, date = ?, payment_method = ?, recurrence = ?, recurrence_end_date = ?, credit_card_id = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            stmt.run(updates.type, updates.amount, updates.category, updates.description, updates.date, updates.payment_method || 'pix', updates.recurrence || null, updates.recurrence_end_date || null, updates.credit_card_id || null, id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async deleteTransaction(id, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM transactions WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async addIncome(income, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO incomes (description, amount, category, date, recurrence, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run(income.description, income.amount, income.category, income.date, income.recurrence || 'specific', userId || income.user_id || null, function (err) {
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
    async getIncomes(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM incomes${userId !== undefined ? ' WHERE user_id = ?' : ''} ORDER BY date DESC
            `, userId !== undefined ? [userId] : [], (err, rows) => {
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
                        date: row.date,
                        recurrence: row.recurrence || 'specific'
                    })));
                }
            });
        });
    }
    async updateIncome(id, updates, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE incomes
                SET description = ?, amount = ?, category = ?, date = ?, recurrence = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            stmt.run(updates.description, updates.amount, updates.category, updates.date, updates.recurrence || 'specific', id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async deleteIncome(id, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM incomes WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async addExpense(expense, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO expenses (description, amount, category, date, recurrence, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run(expense.description, expense.amount, expense.category, expense.date, expense.recurrence || 'specific', userId || expense.user_id || null, function (err) {
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
    async getExpenses(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM expenses${userId !== undefined ? ' WHERE user_id = ?' : ''} ORDER BY date DESC
            `, userId !== undefined ? [userId] : [], (err, rows) => {
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
                        date: row.date,
                        recurrence: row.recurrence || 'specific',
                        completed_at: row.completed_at || null
                    })));
                }
            });
        });
    }
    async updateExpense(id, updates, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE expenses
                SET description = ?, amount = ?, category = ?, date = ?, recurrence = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            stmt.run(updates.description, updates.amount, updates.category, updates.date, updates.recurrence || 'specific', id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    /** Marca (data civil) ou desmarca (null) a despesa como concluída. */
    async setExpenseCompleted(id, completedAt, userId) {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE expenses SET completed_at = ? WHERE id = ? AND user_id = ?', [completedAt, id, userId], function (err) {
                if (err)
                    reject(err);
                else
                    resolve(this.changes > 0);
            });
        });
    }
    async deleteExpense(id, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM expenses WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function (err) {
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
        await this.ready;
        if (this.recurrenceRun)
            return this.recurrenceRun;
        this.recurrenceRun = this.generateRecurringTransactions().finally(() => { this.recurrenceRun = null; });
        return this.recurrenceRun;
    }
    async generateRecurringTransactions() {
        const rows = await this.all(`SELECT * FROM transactions WHERE user_id IS NOT NULL AND recurrence IS NOT NULL AND recurrence != '' AND recurrence_source_id IS NULL`);
        const today = (0, calendar_1.todayCivil)();
        let created = 0;
        for (const source of rows) {
            const anchor = (0, calendar_1.civilDate)(source.date);
            const end = source.recurrence_end_date ? (0, calendar_1.civilDate)(source.recurrence_end_date) : null;
            if (!anchor || !calendar_1.recurrenceTypes.includes(source.recurrence) || (source.recurrence_end_date && !end))
                continue;
            for (let index = 1; index <= 100000; index++) {
                const date = (0, calendar_1.recurrenceDate)(anchor, source.recurrence, index);
                if (date > today || (end && date > end))
                    break;
                const changed = await new Promise((resolve, reject) => {
                    this.db.run(`INSERT OR IGNORE INTO transactions
                        (type, amount, category, description, date, payment_method, credit_card_id, user_id, recurrence_source_id, occurrence_date)
                        SELECT type, amount, category, description, ?, payment_method, credit_card_id, user_id, id, ?
                        FROM transactions WHERE id = ? AND user_id = ?
                        AND NOT EXISTS (SELECT 1 FROM removed_occurrences WHERE source_id = ? AND occurrence_date = ?)`, [date, date, source.id, source.user_id, source.id, date], function (err) {
                        if (err)
                            reject(err);
                        else
                            resolve(this.changes);
                    });
                });
                created += changed;
            }
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
    async addShoppingItem(item, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO shopping_items (item, category, estimated_price, purchase_url, purchased, user_id, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM shopping_items WHERE user_id = ?))
            `);
            stmt.run(item.item, item.category, item.estimatedPrice || item.estimated_price || 0, item.purchaseUrl || item.purchase_url || null, item.purchased ? 1 : 0, userId || item.user_id || null, userId || item.user_id || null, function (err) {
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
    async getShoppingItems(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM shopping_items${userId !== undefined ? ' WHERE user_id = ?' : ''} ORDER BY purchased ASC, sort_order ASC, created_at DESC`, userId !== undefined ? [userId] : [], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows.map((row) => ({
                        ...row,
                        estimatedPrice: row.estimated_price,
                        purchaseUrl: row.purchase_url,
                        sortOrder: row.sort_order,
                        purchased: row.purchased === 1
                    })));
                }
            });
        });
    }
    async updateShoppingItem(id, updates, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE shopping_items 
                SET item = ?, category = ?, estimated_price = ?, purchase_url = ?, purchased = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            stmt.run(updates.item, updates.category, updates.estimatedPrice || updates.estimated_price, updates.purchaseUrl || updates.purchase_url || null, updates.purchased ? 1 : 0, id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async toggleShoppingItemPurchased(id, userId) {
        await this.run(`UPDATE shopping_items
             SET purchased = CASE WHEN purchased = 1 THEN 0 ELSE 1 END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`, [id, userId]);
        const items = await this.all('SELECT purchased FROM shopping_items WHERE id = ? AND user_id = ?', [id, userId]);
        return items.length === 0 ? null : items[0].purchased === 1;
    }
    async deleteShoppingItem(id, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM shopping_items WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async reorderShoppingItems(itemIds, userId) {
        const ownedItems = await this.all('SELECT id FROM shopping_items WHERE user_id = ?', [userId]);
        const ownedIds = new Set(ownedItems.map(item => item.id));
        if (itemIds.length !== ownedIds.size || itemIds.some(id => !ownedIds.has(id)))
            return false;
        await this.run('BEGIN TRANSACTION');
        try {
            for (let index = 0; index < itemIds.length; index++) {
                await this.run('UPDATE shopping_items SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [index, itemIds[index], userId]);
            }
            await this.run('COMMIT');
            return true;
        }
        catch (error) {
            await this.run('ROLLBACK');
            throw error;
        }
    }
    async addCreditCard(card, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO credit_cards (name, bank, credit_limit, closing_date, due_date, current_balance, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(card.name, card.bank, card.creditLimit || card.credit_limit || 0, card.closingDate || card.closing_date, card.dueDate || card.due_date, card.currentBalance || card.current_balance || 0, userId || card.user_id || null, function (err) {
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
    async getCreditCards(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM credit_cards${userId !== undefined ? ' WHERE user_id = ?' : ''} ORDER BY created_at DESC`, userId !== undefined ? [userId] : [], (err, rows) => {
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
    async updateCreditCard(id, updates, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE credit_cards 
                SET name = ?, bank = ?, credit_limit = ?, closing_date = ?, due_date = ?, current_balance = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            stmt.run(updates.name, updates.bank, updates.creditLimit || updates.credit_limit, updates.closingDate || updates.closing_date, updates.dueDate || updates.due_date, updates.currentBalance || updates.current_balance || 0, id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async deleteCreditCard(id, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM credit_cards WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async addBudget(budget, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO budgets (category, amount, period, spent, user_id)
                VALUES (?, ?, ?, ?, ?)
            `);
            stmt.run(budget.category, budget.amount, budget.period, budget.spent || 0, userId || budget.user_id || null, function (err) {
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
    async getBudgets(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM budgets${userId !== undefined ? ' WHERE user_id = ?' : ''} ORDER BY created_at DESC`, userId !== undefined ? [userId] : [], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    async updateBudget(id, updates, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE budgets 
                SET category = ?, amount = ?, period = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            stmt.run(updates.category, updates.amount, updates.period, id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async deleteBudget(id, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM budgets WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async addInstallmentGroup(group, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO installment_groups (name, due_day, description, user_id)
                VALUES (?, ?, ?, ?)
            `);
            stmt.run(group.name, group.dueDay ?? group.due_day ?? null, group.description ?? null, userId, function (err) {
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
    async getInstallmentGroups(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM installment_groups
                WHERE user_id = ?
                ORDER BY COALESCE(due_day, 99), name
            `, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows.map((row) => ({
                        ...row,
                        dueDay: row.due_day
                    })));
                }
            });
        });
    }
    async updateInstallmentGroup(id, updates, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE installment_groups
                SET name = ?, due_day = ?, description = ?
                WHERE id = ? AND user_id = ?
            `);
            stmt.run(updates.name, updates.dueDay ?? updates.due_day ?? null, updates.description ?? null, id, userId, function (err) {
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
    async deleteInstallmentGroup(id, userId) {
        await this.run('UPDATE installments SET installment_group_id = NULL WHERE installment_group_id = ? AND user_id = ?', [id, userId]);
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('DELETE FROM installment_groups WHERE id = ? AND user_id = ?');
            stmt.run(id, userId, function (err) {
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
    async addSubscriptionGroup(group, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO subscription_groups (name, description, user_id)
                VALUES (?, ?, ?)
            `);
            stmt.run(group.name, group.description ?? null, userId, function (err) {
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
    async getSubscriptionGroups(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM subscription_groups
                WHERE user_id = ?
                ORDER BY name
            `, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    async updateSubscriptionGroup(id, updates, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE subscription_groups
                SET name = ?, description = ?
                WHERE id = ? AND user_id = ?
            `);
            stmt.run(updates.name, updates.description ?? null, id, userId, function (err) {
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
    async deleteSubscriptionGroup(id, userId) {
        await this.run('UPDATE financial_goals SET subscription_group_id = NULL WHERE subscription_group_id = ? AND user_id = ?', [id, userId]);
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('DELETE FROM subscription_groups WHERE id = ? AND user_id = ?');
            stmt.run(id, userId, function (err) {
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
    async addInstallment(installment, userId) {
        return new Promise((resolve, reject) => {
            const installmentAmounts = this.serializeInstallmentAmounts(installment);
            const stmt = this.db.prepare(`
                INSERT INTO installments (
                    description, total_amount, installment_amount, installment_amounts, total_installments,
                    current_installment, start_date, category, credit_card_id, installment_group_id, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(installment.description, installment.totalAmount ?? installment.total_amount, installment.installmentAmount ?? installment.installment_amount, installmentAmounts, installment.totalInstallments ?? installment.total_installments, 0, installment.startDate ?? installment.start_date, installment.category, installment.creditCardId ?? installment.credit_card_id ?? null, installment.installmentGroupId ?? installment.installment_group_id ?? null, userId ?? installment.user_id ?? null, function (err) {
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
    async getInstallments(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT i.*, c.name as card_name, c.bank as card_bank,
                       g.name as group_name, g.due_day as group_due_day, g.description as group_description
                FROM installments i
                LEFT JOIN credit_cards c ON i.credit_card_id = c.id
                LEFT JOIN installment_groups g ON i.installment_group_id = g.id
                ${userId !== undefined ? 'WHERE i.user_id = ?' : ''}
                ORDER BY COALESCE(g.due_day, 99), g.name, i.start_date DESC
            `, userId !== undefined ? [userId] : [], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows.map((row) => ({
                        ...row,
                        totalAmount: row.total_amount,
                        installmentAmount: row.installment_amount,
                        installmentAmounts: this.parseInstallmentAmounts(row.installment_amounts),
                        totalInstallments: row.total_installments,
                        currentInstallment: row.current_installment,
                        startDate: row.start_date,
                        creditCardId: row.credit_card_id,
                        installmentGroupId: row.installment_group_id,
                        groupName: row.group_name,
                        groupDueDay: row.group_due_day,
                        groupDescription: row.group_description
                    })));
                }
            });
        });
    }
    async updateInstallment(id, updates, userId) {
        return new Promise((resolve, reject) => {
            const description = updates.description;
            const totalAmount = updates.totalAmount ?? updates.total_amount;
            const installmentAmount = updates.installmentAmount ?? updates.installment_amount;
            const installmentAmounts = this.serializeInstallmentAmounts(updates);
            const totalInstallments = updates.totalInstallments ?? updates.total_installments;
            const currentInstallment = updates.currentInstallment ?? updates.current_installment;
            const category = updates.category;
            const startDate = updates.startDate ?? updates.start_date;
            const creditCardId = updates.creditCardId ?? updates.credit_card_id ?? null;
            const installmentGroupId = updates.installmentGroupId ?? updates.installment_group_id ?? null;
            const stmt = this.db.prepare(`
                UPDATE installments
                SET description = ?,
                    total_amount = ?,
                    installment_amount = ?,
                    installment_amounts = ?,
                    total_installments = ?,
                    current_installment = ?,
                    category = ?,
                    start_date = ?,
                    credit_card_id = ?,
                    installment_group_id = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            stmt.run(description, totalAmount, installmentAmount, installmentAmounts, totalInstallments, currentInstallment, category, startDate, creditCardId, installmentGroupId, id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async updateInstallmentCurrentInstallment(id, currentInstallment, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE installments
                SET current_installment = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            stmt.run(currentInstallment, id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    serializeInstallmentAmounts(installment) {
        const raw = installment.installmentAmounts ?? installment.installment_amounts;
        if (!Array.isArray(raw))
            return null;
        const totalInstallments = Number(installment.totalInstallments ?? installment.total_installments ?? raw.length);
        const amounts = raw
            .slice(0, totalInstallments)
            .map((value) => Number(value))
            .map((value) => Number.isFinite(value) ? Math.round(value * 100) / 100 : 0);
        if (amounts.length !== totalInstallments || amounts.some((value) => value < 0))
            return null;
        return JSON.stringify(amounts);
    }
    parseInstallmentAmounts(value) {
        if (!value)
            return null;
        try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed))
                return null;
            return parsed
                .map((amount) => Number(amount))
                .filter((amount) => Number.isFinite(amount) && amount >= 0);
        }
        catch {
            return null;
        }
    }
    async deleteInstallment(id, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM installments WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async addFinancialGoal(goal, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO financial_goals (name, target_amount, current_amount, target_date, category, subscription_group_id, payment_day, start_date, end_date, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(goal.name, goal.targetAmount || goal.target_amount || 0, goal.currentAmount || goal.current_amount || 0, goal.targetDate || goal.target_date, goal.category, goal.subscriptionGroupId ?? goal.subscription_group_id ?? null, goal.paymentDay ?? goal.payment_day ?? null, goal.startDate ?? goal.start_date ?? null, goal.endDate ?? goal.end_date ?? null, userId || goal.user_id || null, function (err) {
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
    async getFinancialGoals(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM financial_goals${userId !== undefined ? ' WHERE user_id = ?' : ''} ORDER BY created_at DESC`, userId !== undefined ? [userId] : [], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows.map((row) => ({
                        ...row,
                        targetAmount: row.target_amount,
                        currentAmount: row.current_amount,
                        targetDate: row.target_date,
                        subscriptionGroupId: row.subscription_group_id,
                        paymentDay: row.payment_day,
                        startDate: row.start_date,
                        endDate: row.end_date
                    })));
                }
            });
        });
    }
    async updateFinancialGoal(id, updates, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE financial_goals 
                SET name = ?, target_amount = ?, current_amount = ?, target_date = ?, category = ?, subscription_group_id = ?, payment_day = ?, start_date = ?, end_date = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            stmt.run(updates.name, updates.targetAmount || updates.target_amount, updates.currentAmount || updates.current_amount, updates.targetDate || updates.target_date, updates.category, updates.subscriptionGroupId ?? updates.subscription_group_id ?? null, updates.paymentDay ?? updates.payment_day ?? null, updates.startDate ?? updates.start_date ?? null, updates.endDate ?? updates.end_date ?? null, id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async deleteFinancialGoal(id, userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM financial_goals WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function (err) {
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
    async getCategoryTotals(type, userId) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT category, SUM(amount) as total, COUNT(*) as count
                FROM transactions
            `;
            const params = [];
            const conditions = [];
            if (userId !== undefined) {
                conditions.push('user_id = ?');
                params.push(userId);
            }
            if (type && type !== 'all') {
                conditions.push('type = ?');
                params.push(type);
            }
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
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
    async getMonthlySummary(year, month, userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    type,
                    SUM(amount) as total,
                    COUNT(*) as count
                FROM transactions 
                WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?
                ${userId !== undefined ? 'AND user_id = ?' : ''}
                GROUP BY type
            `;
            const params = [year.toString(), String(month).padStart(2, '0'), ...(userId !== undefined ? [userId] : [])];
            this.db.all(query, params, (err, rows) => {
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