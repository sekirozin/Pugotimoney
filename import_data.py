import pandas as pd
import sqlite3
from datetime import datetime

DB_PATH = '/home/sekiro/Projetos/finance-system/database.sqlite'
XLSX_PATH = '/home/sekiro/Nextcloud/Enrick/Contas do mês/04 - ABRIL.xlsx'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

xls = pd.ExcelFile(XLSX_PATH)
df = pd.read_excel(xls, 'Contas', header=None)

month = '2024-04'  # April reference

# ============================================
# 1. CONTAS FIXAS DO MÊS (transactions)
# ============================================
contas_fixas = [
    ('CONTA DA VIVO', 49, 'Serviços'),
    ('YOUTUBE PREMIUM', 54, 'Assinatura'),
    ('IPTV', 40, 'Assinatura'),
    ('SR. FRANCISCO', 500, 'Serviços'),
    ('INTERNET', 100, 'Serviços'),
    ('TIO LUCIANO', 275, 'Serviços'),
    ('GAMEPASS', 120, 'Assinatura'),
]

for desc, value, cat in contas_fixas:
    cursor.execute("""
        INSERT INTO transactions (type, amount, category, description, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ('expense', value, cat, desc, f'{month}-01', datetime.now().isoformat()))

# ============================================
# 2. ASSINATURAS (transactions + budgets)
# ============================================
assinaturas = [
    ('GAMEPASS', 77, 'Assinatura'),
    ('IPTV', 40, 'Assinatura'),
    ('YOUTUBE', 55, 'Assinatura'),
    ('CHAT GPT BUSINESS', 100, 'Assinatura'),
    ('NETFLIX', 60, 'Assinatura'),
    ('DISNEY+', 67, 'Assinatura'),
]

for desc, value, cat in assinaturas:
    # Check if already inserted above to avoid duplicates
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE description = ?", (desc,))
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO transactions (type, amount, category, description, date, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ('expense', value, cat, desc, f'{month}-01', datetime.now().isoformat()))

    # Create budget for each subscription
    cursor.execute("""
        INSERT INTO budgets (category, amount, period, spent, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (cat, value, 'monthly', 0, datetime.now().isoformat()))

# ============================================
# 3. PARCELAMENTOS (installments)
# ============================================
parcelamentos = [
    ('SR. FRANCISCO', 500, 500, 7, 2, 'Serviços'),
    ('CARTÃO TIO LUCIANO', 2520, 280, 10, 1, 'Serviços'),
    ('SHOPPEEE', 1020, 170, 6, 0, 'Compras'),
    ('MERCADO LIVRE', 2148, 179, 12, 0, 'Compras'),
    ('CONTA VIVO', 141, 49, 3, 0, 'Serviços'),
]

for desc, total, installment_val, total_inst, current_inst, cat in parcelamentos:
    cursor.execute("""
        INSERT INTO installments (description, total_amount, installment_amount, total_installments, current_installment, start_date, category, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (desc, total, installment_val, total_inst, current_inst, f'{month}-01', cat, datetime.now().isoformat()))

# ============================================
# 4. LISTA DE COMPRAS (shopping_items)
# ============================================
compras = [
    ('FILTRO DE LINHA INTELIGENTE', 100),
    ('TOMADA INTELIGENTE', 60),
    ('FAMÁCIA BANHEIRO', 100),
    ('LÂMPADA INTELIGENTE', 45),
    ('MÓDULO BLUETOOTH KZ', 259),
    ('LÂMPADAS COM SENSOR (PARA A ESCADA)', 48),
    ('KIT DE SLEEVES YUGIOH', 100),
    ('FILAMENTO PLA PRETO', 112),
    ('JOGOS DO MÊS', 150),
    ('TV', 2800),
]

for item, price in compras:
    cursor.execute("""
        INSERT INTO shopping_items (item, category, estimated_price, purchased, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (item, 'Eletrônicos', price, False, datetime.now().isoformat(), datetime.now().isoformat()))

# ============================================
# 5. DÍVIDAS SERASA (financial_goals - as debts to pay off)
# ============================================
dividas = [
    ('Dívida INTER', 4841.83, 'Dívida'),
    ('Dívida ITAU', 223.97, 'Dívida'),
    ('Dívida C6 BANK', 988.81, 'Dívida'),
    ('Dívida IPANEMA', 376.72, 'Dívida'),
    ('Dívida BRADESCO', 2079.59, 'Dívida'),
]

for name, amount, cat in dividas:
    cursor.execute("""
        INSERT INTO financial_goals (name, target_amount, current_amount, target_date, category, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (name, amount, 0, '2026-12-31', cat, datetime.now().isoformat()))

# ============================================
# 6. CARTÕES DE CRÉDITO (credit_cards)
# ============================================
cards = [
    ('NUBANK', 'Nubank', 1864, 1864),
    ('PICPAY', 'PicPay', 1055, 1055),
]

for name, bank, balance, limit in cards:
    cursor.execute("""
        INSERT INTO credit_cards (name, bank, credit_limit, closing_date, due_date, current_balance, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (name, bank, limit, '5', '10', balance, datetime.now().isoformat()))

conn.commit()
print('Dados importados com sucesso!')
print(f'Transações: {cursor.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]}')
print(f'Parcelamentos: {cursor.execute("SELECT COUNT(*) FROM installments").fetchone()[0]}')
print(f'Lista de Compras: {cursor.execute("SELECT COUNT(*) FROM shopping_items").fetchone()[0]}')
print(f'Assinaturas/Budgets: {cursor.execute("SELECT COUNT(*) FROM budgets").fetchone()[0]}')
print(f'Dívidas/Metas: {cursor.execute("SELECT COUNT(*) FROM financial_goals").fetchone()[0]}')
print(f'Cartões: {cursor.execute("SELECT COUNT(*) FROM credit_cards").fetchone()[0]}')
conn.close()
