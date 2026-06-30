import sqlite3 from 'sqlite3';
import path from 'path';

export class Database {
    private db: sqlite3.Database;

    constructor() {
        const dbPath = path.join(__dirname, '../../database.sqlite');
        this.db = new sqlite3.Database(dbPath, (err: Error | null) => {
            if (err) {
                console.error('Erro ao conectar ao banco de dados:', err);
            } else {
                console.log('Conectado ao banco de SQLite');
                this.initializeTables();
            }
        });
        this.db.configure('busyTimeout', 5000);
    }

    private initializeTables() {
        const createTables = () => {
            return new Promise<void>((resolve, reject) => {
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
                        installment_amounts TEXT,
                        total_installments INTEGER NOT NULL,
                        current_installment INTEGER DEFAULT 0,
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
                `, (err: Error | null) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        };

        createTables()
            .then(async () => {
                await this.runMigrations();
                await this.insertDefaultCategories();
            })
            .catch((err) => {
                console.error('Erro ao criar tabelas:', err);
            });
    }

    private async runMigrations() {
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
            "ALTER TABLE credit_cards ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE budgets ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE installments ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE installments ADD COLUMN installment_amounts TEXT",
            "ALTER TABLE financial_goals ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE incomes ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE incomes ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'specific'"
        ];
        for (const sql of migrations) {
            try { await this.run(sql); } catch (e) { /* coluna já existe */ }
        }
        await this.assignLegacyDataToFirstUser();
    }

    private async assignLegacyDataToFirstUser(): Promise<void> {
        const users = await this.all<{ id: number }>('SELECT id FROM users ORDER BY id ASC LIMIT 1');
        if (users.length === 0) return;
        await this.assignLegacyDataToUser(users[0].id);
    }

    async assignLegacyDataToUser(userId: number): Promise<void> {
        const tables = ['transactions', 'shopping_items', 'credit_cards', 'budgets', 'installments', 'financial_goals', 'incomes'];
        for (const table of tables) {
            await this.run(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`, [userId]);
        }
    }

    private async insertDefaultCategories(): Promise<void> {
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
            await this.run(
                `INSERT OR IGNORE INTO categories (name, type, color) VALUES (?, ?, ?)`,
                [category.name, category.type, category.color]
            );
        }
    }

    async addTransaction(transaction: any, userId?: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO transactions (type, amount, category, description, date, payment_method, recurrence, recurrence_end_date, credit_card_id, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                transaction.type,
                transaction.amount,
                transaction.category,
                transaction.description,
                transaction.date,
                transaction.payment_method || 'pix',
                transaction.recurrence || null,
                transaction.recurrence_end_date || null,
                transaction.credit_card_id || null,
                userId || transaction.user_id || null,
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).lastID);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    async getTransactions(filters?: any, userId?: number): Promise<any[]> {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM transactions';
            const params: any[] = [];
            
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
                if (filters.endDate) {
                    conditions.push('date <= ?');
                    params.push(filters.endDate);
                }
            }
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            
            query += ' ORDER BY date DESC';
            
            this.db.all(query, params, (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async updateTransaction(id: number, updates: any, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE transactions 
                SET type = ?, amount = ?, category = ?, description = ?, date = ?, payment_method = ?, recurrence = ?, recurrence_end_date = ?, credit_card_id = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            
            stmt.run(
                updates.type,
                updates.amount,
                updates.category,
                updates.description,
                updates.date,
                updates.payment_method || 'pix',
                updates.recurrence || null,
                updates.recurrence_end_date || null,
                updates.credit_card_id || null,
                id,
                ...(userId !== undefined ? [userId] : []),
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).changes > 0);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    async deleteTransaction(id: number, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM transactions WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function(this: any, err: Error | null) {
                if (err) {
                    reject(err);
                } else {
                    resolve((this as any).changes > 0);
                }
            });
            stmt.finalize();
        });
    }

    async addIncome(income: any, userId?: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO incomes (description, amount, category, date, recurrence, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run(
                income.description,
                income.amount,
                income.category,
                income.date,
                income.recurrence || 'specific',
                userId || income.user_id || null,
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).lastID);
                    }
                }
            );
            stmt.finalize();
        });
    }

    async getIncomes(userId?: number): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM incomes${userId !== undefined ? ' WHERE user_id = ?' : ''} ORDER BY date DESC
            `, userId !== undefined ? [userId] : [], (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map((row: any) => ({
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

    async updateIncome(id: number, updates: any, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE incomes
                SET description = ?, amount = ?, category = ?, date = ?, recurrence = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            stmt.run(
                updates.description,
                updates.amount,
                updates.category,
                updates.date,
                updates.recurrence || 'specific',
                id,
                ...(userId !== undefined ? [userId] : []),
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).changes > 0);
                    }
                }
            );
            stmt.finalize();
        });
    }

    async deleteIncome(id: number, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM incomes WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function(this: any, err: Error | null) {
                if (err) {
                    reject(err);
                } else {
                    resolve((this as any).changes > 0);
                }
            });
            stmt.finalize();
        });
    }

    async addUser(user: { username: string; password: string; role: string }): Promise<number> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
            stmt.run(user.username, user.password, user.role, function(this: any, err: Error | null) {
                if (err) { reject(err); } else { resolve((this as any).lastID); }
            });
            stmt.finalize();
        });
    }

    async getUserByUsername(username: string): Promise<any | null> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE username = ?', [username], (err: Error | null, row: any) => {
                if (err) { reject(err); } else { resolve(row || null); }
            });
        });
    }

    async getUserCount(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT COUNT(*) as count FROM users', (err: Error | null, row: any) => {
                if (err) { reject(err); } else { resolve(row ? row.count : 0); }
            });
        });
    }

    async getUserById(id: number): Promise<any | null> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT id, username, role, bio, location, avatar_url, created_at FROM users WHERE id = ?', [id], (err: Error | null, row: any) => {
                if (err) { reject(err); } else { resolve(row || null); }
            });
        });
    }

    async updateProfile(id: number, data: { bio?: string; location?: string; avatar_url?: string }): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const fields: string[] = [];
            const values: any[] = [];
            if (data.bio !== undefined) { fields.push('bio = ?'); values.push(data.bio); }
            if (data.location !== undefined) { fields.push('location = ?'); values.push(data.location); }
            if (data.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(data.avatar_url); }
            if (fields.length === 0) { resolve(false); return; }
            values.push(id);
            this.db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values, function(this: any, err: Error | null) {
                if (err) { reject(err); } else { resolve((this as any).changes > 0); }
            });
        });
    }

    async processRecurringTransactions(): Promise<number> {
        const nextDate = (d: Date, rec: string): Date => {
            const nd = new Date(d);
            if (rec === 'daily') nd.setDate(nd.getDate() + 1);
            else if (rec === 'weekly') nd.setDate(nd.getDate() + 7);
            else if (rec === 'monthly') nd.setMonth(nd.getMonth() + 1);
            else if (rec === 'yearly') nd.setFullYear(nd.getFullYear() + 1);
            return nd;
        };

        const rows = await this.all<Record<string, any>>(
            `SELECT * FROM transactions WHERE recurrence IS NOT NULL AND recurrence != ''`
        );

        let created = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const t of rows) {
            const rec = t.recurrence as string;
            const endDate = t.recurrence_end_date ? new Date(t.recurrence_end_date + 'T00:00:00') : null;
            let current = new Date(t.date.split('T')[0] + 'T00:00:00');
            let last = new Date(current);

            while (current <= today) {
                const next = nextDate(current, rec);
                if (endDate && next > endDate) break;
                current = next;
            }

            if (current.getTime() === last.getTime()) continue;

            let gen = new Date(last);
            while (true) {
                const next = nextDate(gen, rec);
                if (next > today) break;
                if (endDate && next > endDate) break;
                const dateStr = next.toISOString().split('T')[0];
                await this.run(
                    `INSERT INTO transactions (type, amount, category, description, date, payment_method) VALUES (?, ?, ?, ?, ?, ?)`,
                    [t.type, t.amount, t.category, t.description, dateStr + 'T12:00:00', t.payment_method || 'pix']
                );
                created++;
                gen = next;
            }

            const newDateStr = current.toISOString().split('T')[0];
            await this.run(`UPDATE transactions SET date = ? WHERE id = ?`, [newDateStr + 'T12:00:00', t.id]);
        }

        return created;
    }

    private async run(sql: string, params: any[] = []): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, (err: Error | null) => {
                if (err) reject(err); else resolve();
            });
        });
    }

    private async all<T>(sql: string, params: any[] = []): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err: Error | null, rows: T[]) => {
                if (err) reject(err); else resolve(rows);
            });
        });
    }

    async addShoppingItem(item: any, userId?: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO shopping_items (item, category, estimated_price, purchased, user_id)
                VALUES (?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                item.item,
                item.category,
                item.estimatedPrice || item.estimated_price || 0,
                item.purchased ? 1 : 0,
                userId || item.user_id || null,
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).lastID);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    async getShoppingItems(userId?: number): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM shopping_items${userId !== undefined ? ' WHERE user_id = ?' : ''} ORDER BY purchased ASC, created_at DESC`,
                userId !== undefined ? [userId] : [],
                (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map((row: any) => ({
                        ...row,
                        estimatedPrice: row.estimated_price,
                        purchased: row.purchased === 1
                    })));
                }
            });
        });
    }

    async updateShoppingItem(id: number, updates: any, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE shopping_items 
                SET item = ?, category = ?, estimated_price = ?, purchased = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            
            stmt.run(
                updates.item,
                updates.category,
                updates.estimatedPrice || updates.estimated_price,
                updates.purchased ? 1 : 0,
                id,
                ...(userId !== undefined ? [userId] : []),
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).changes > 0);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    async deleteShoppingItem(id: number, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM shopping_items WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function(this: any, err: Error | null) {
                if (err) {
                    reject(err);
                } else {
                    resolve((this as any).changes > 0);
                }
            });
            stmt.finalize();
        });
    }

    async addCreditCard(card: any, userId?: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO credit_cards (name, bank, credit_limit, closing_date, due_date, current_balance, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                card.name,
                card.bank,
                card.creditLimit || card.credit_limit || 0,
                card.closingDate || card.closing_date,
                card.dueDate || card.due_date,
                card.currentBalance || card.current_balance || 0,
                userId || card.user_id || null,
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).lastID);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    async getCreditCards(userId?: number): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM credit_cards${userId !== undefined ? ' WHERE user_id = ?' : ''} ORDER BY created_at DESC`,
                userId !== undefined ? [userId] : [],
                (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map((row: any) => ({
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

    async updateCreditCard(id: number, updates: any, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE credit_cards 
                SET name = ?, bank = ?, credit_limit = ?, closing_date = ?, due_date = ?, current_balance = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            
            stmt.run(
                updates.name,
                updates.bank,
                updates.creditLimit || updates.credit_limit,
                updates.closingDate || updates.closing_date,
                updates.dueDate || updates.due_date,
                updates.currentBalance || updates.current_balance || 0,
                id,
                ...(userId !== undefined ? [userId] : []),
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).changes > 0);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    async deleteCreditCard(id: number, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM credit_cards WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function(this: any, err: Error | null) {
                if (err) {
                    reject(err);
                } else {
                    resolve((this as any).changes > 0);
                }
            });
            stmt.finalize();
        });
    }

    async addBudget(budget: any, userId?: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO budgets (category, amount, period, spent, user_id)
                VALUES (?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                budget.category,
                budget.amount,
                budget.period,
                budget.spent || 0,
                userId || budget.user_id || null,
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).lastID);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    async getBudgets(userId?: number): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM budgets${userId !== undefined ? ' WHERE user_id = ?' : ''} ORDER BY created_at DESC`,
                userId !== undefined ? [userId] : [],
                (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async updateBudget(id: number, updates: any, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE budgets 
                SET category = ?, amount = ?, period = ?, spent = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            
            stmt.run(
                updates.category,
                updates.amount,
                updates.period,
                updates.spent,
                id,
                ...(userId !== undefined ? [userId] : []),
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).changes > 0);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    async deleteBudget(id: number, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM budgets WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function(this: any, err: Error | null) {
                if (err) {
                    reject(err);
                } else {
                    resolve((this as any).changes > 0);
                }
            });
            stmt.finalize();
        });
    }

    async addInstallment(installment: any, userId?: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const installmentAmounts = this.serializeInstallmentAmounts(installment);
            const stmt = this.db.prepare(`
                INSERT INTO installments (
                    description, total_amount, installment_amount, installment_amounts, total_installments,
                    current_installment, start_date, category, credit_card_id, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                installment.description,
                installment.totalAmount ?? installment.total_amount,
                installment.installmentAmount ?? installment.installment_amount,
                installmentAmounts,
                installment.totalInstallments ?? installment.total_installments,
                0,
                installment.startDate ?? installment.start_date,
                installment.category,
                installment.creditCardId ?? installment.credit_card_id ?? null,
                userId ?? installment.user_id ?? null,
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).lastID);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    async getInstallments(userId?: number): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT i.*, c.name as card_name, c.bank as card_bank
                FROM installments i
                LEFT JOIN credit_cards c ON i.credit_card_id = c.id
                ${userId !== undefined ? 'WHERE i.user_id = ?' : ''}
                ORDER BY i.start_date DESC
            `, userId !== undefined ? [userId] : [], (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map((row: any) => ({
                        ...row,
                        totalAmount: row.total_amount,
                        installmentAmount: row.installment_amount,
                        installmentAmounts: this.parseInstallmentAmounts(row.installment_amounts),
                        totalInstallments: row.total_installments,
                        currentInstallment: row.current_installment,
                        startDate: row.start_date,
                        creditCardId: row.credit_card_id
                    })));
                }
            });
        });
    }

    async updateInstallment(id: number, updates: any, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const description = updates.description;
            const totalAmount = updates.totalAmount ?? updates.total_amount;
            const installmentAmount = updates.installmentAmount ?? updates.installment_amount;
            const installmentAmounts = this.serializeInstallmentAmounts(updates);
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
                    installment_amounts = ?,
                    total_installments = ?,
                    current_installment = ?,
                    category = ?,
                    start_date = ?,
                    credit_card_id = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);

            stmt.run(
                description,
                totalAmount,
                installmentAmount,
                installmentAmounts,
                totalInstallments,
                currentInstallment,
                category,
                startDate,
                creditCardId,
                id,
                ...(userId !== undefined ? [userId] : []),
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).changes > 0);
                    }
                }
            );

            stmt.finalize();
        });
    }

    async updateInstallmentCurrentInstallment(id: number, currentInstallment: number, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE installments
                SET current_installment = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);

            stmt.run(
                currentInstallment,
                id,
                ...(userId !== undefined ? [userId] : []),
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).changes > 0);
                    }
                }
            );

            stmt.finalize();
        });
    }

    private serializeInstallmentAmounts(installment: any): string | null {
        const raw = installment.installmentAmounts ?? installment.installment_amounts;
        if (!Array.isArray(raw)) return null;

        const totalInstallments = Number(installment.totalInstallments ?? installment.total_installments ?? raw.length);
        const amounts = raw
            .slice(0, totalInstallments)
            .map((value: any) => Number(value))
            .map((value: number) => Number.isFinite(value) ? Math.round(value * 100) / 100 : 0);

        if (amounts.length !== totalInstallments || amounts.some((value: number) => value < 0)) return null;
        return JSON.stringify(amounts);
    }

    private parseInstallmentAmounts(value: string | null): number[] | null {
        if (!value) return null;

        try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) return null;
            return parsed
                .map((amount: any) => Number(amount))
                .filter((amount: number) => Number.isFinite(amount) && amount >= 0);
        } catch {
            return null;
        }
    }

    async deleteInstallment(id: number, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM installments WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function(this: any, err: Error | null) {
                if (err) {
                    reject(err);
                } else {
                    resolve((this as any).changes > 0);
                }
            });
            stmt.finalize();
        });
    }

    async processInstallmentAdvancement(): Promise<number> {
        const installments = await this.getInstallments();
        const today = new Date();
        let advanced = 0;

        for (const inst of installments) {
            const total = inst.totalInstallments;
            const current = inst.currentInstallment;
            if (current >= total) continue;

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

    async addFinancialGoal(goal: any, userId?: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO financial_goals (name, target_amount, current_amount, target_date, category, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                goal.name,
                goal.targetAmount || goal.target_amount || 0,
                goal.currentAmount || goal.current_amount || 0,
                goal.targetDate || goal.target_date,
                goal.category,
                userId || goal.user_id || null,
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).lastID);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    async getFinancialGoals(userId?: number): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM financial_goals${userId !== undefined ? ' WHERE user_id = ?' : ''} ORDER BY created_at DESC`,
                userId !== undefined ? [userId] : [],
                (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map((row: any) => ({
                        ...row,
                        targetAmount: row.target_amount,
                        currentAmount: row.current_amount,
                        targetDate: row.target_date
                    })));
                }
            });
        });
    }

    async updateFinancialGoal(id: number, updates: any, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE financial_goals 
                SET name = ?, target_amount = ?, current_amount = ?, target_date = ?, category = ?
                WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}
            `);
            
            stmt.run(
                updates.name,
                updates.targetAmount || updates.target_amount,
                updates.currentAmount || updates.current_amount,
                updates.targetDate || updates.target_date,
                updates.category,
                id,
                ...(userId !== undefined ? [userId] : []),
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).changes > 0);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    async deleteFinancialGoal(id: number, userId?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`DELETE FROM financial_goals WHERE id = ?${userId !== undefined ? ' AND user_id = ?' : ''}`);
            stmt.run(id, ...(userId !== undefined ? [userId] : []), function(this: any, err: Error | null) {
                if (err) {
                    reject(err);
                } else {
                    resolve((this as any).changes > 0);
                }
            });
            stmt.finalize();
        });
    }

    async getCategories(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM categories ORDER BY name', (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async addCategory(category: any): Promise<number> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO categories (name, type, color)
                VALUES (?, ?, ?)
            `);
            
            stmt.run(
                category.name,
                category.type,
                category.color,
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).lastID);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    async getCategoryTotals(type?: 'income' | 'expense' | 'all', userId?: number): Promise<any[]> {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT category, SUM(amount) as total, COUNT(*) as count
                FROM transactions
            `;
            const params: any[] = [];
            
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
            
            this.db.all(query, params, (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getMonthlySummary(year: number, month: number, userId?: number): Promise<any> {
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
            this.db.all(query, params, (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    const result: any = { income: 0, expense: 0 };
                    rows.forEach((row: any) => {
                        result[row.type] = row.total;
                    });
                    resolve(result);
                }
            });
        });
    }

    async updateCategory(id: number, updates: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE categories 
                SET name = ?, type = ?, color = ?
                WHERE id = ?
            `);
            
            stmt.run(
                updates.name,
                updates.type,
                updates.color,
                id,
                function(this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((this as any).changes > 0);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    async deleteCategory(id: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?');
            stmt.run(id, function(this: any, err: Error | null) {
                if (err) {
                    reject(err);
                } else {
                    resolve((this as any).changes > 0);
                }
            });
            stmt.finalize();
        });
    }

    close(): void {
        this.db.close((err: Error | null) => {
            if (err) {
                console.error('Erro ao fechar conexão com o banco de dados:', err);
            } else {
                console.log('Conexão com o banco de dados fechada');
            }
        });
    }
}

export const database = new Database();
