import { Request, Response } from 'express';
import { database } from '../models/database';
import { CreditCard } from '../models/types';
import { validateCreditCard, formatCurrency, getCardAvailableLimit } from '../utils/helpers';
import { processStatement } from '../services/statementService';
import { AuthRequest } from '../middleware/auth';

export class CreditCardController {
    // Obter todos os cartões de crédito
    async getCreditCards(req: AuthRequest, res: Response) {
        try {
            const cards = await database.getCreditCards(req.user!.id);
            
            // Calcular limite disponível para cada cartão
            const cardsWithAvailableLimit = cards.map(card => ({
                ...card,
                availableLimit: getCardAvailableLimit(card)
            }));
            
            res.json({
                success: true,
                data: cardsWithAvailableLimit,
                total: cards.length
            });
        } catch (error) {
            console.error('Erro ao buscar cartões de crédito:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar cartões de crédito'
            });
        }
    }

    // Adicionar novo cartão de crédito
    async addCreditCard(req: AuthRequest, res: Response) {
        try {
            const cardData = req.body;
            
            // Validar dados
            const validation = validateCreditCard(cardData);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Dados inválidos',
                    errors: validation.errors
                });
            }

            const cardId = await database.addCreditCard(cardData, req.user!.id);
            
            res.status(201).json({
                success: true,
                data: { id: cardId, ...cardData },
                message: 'Cartão de crédito adicionado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao adicionar cartão de crédito:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao adicionar cartão de crédito'
            });
        }
    }

    // Atualizar cartão de crédito
    async updateCreditCard(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const updates = req.body;
            
            // Validar dados
            const validation = validateCreditCard(updates);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Dados inválidos',
                    errors: validation.errors
                });
            }

            const updated = await database.updateCreditCard(parseInt(id), updates, req.user!.id);
            
            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: 'Cartão não encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Cartão de crédito atualizado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao atualizar cartão de crédito:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar cartão de crédito'
            });
        }
    }

    // Excluir cartão de crédito
    async deleteCreditCard(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            
            const deleted = await database.deleteCreditCard(parseInt(id), req.user!.id);
            
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Cartão não encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Cartão de crédito excluído com sucesso'
            });
        } catch (error) {
            console.error('Erro ao excluir cartão de crédito:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao excluir cartão de crédito'
            });
        }
    }

    // Obter resumo dos cartões
    async getCardsSummary(req: AuthRequest, res: Response) {
        try {
            const cards = await database.getCreditCards(req.user!.id);
            
            const totalLimit = cards.reduce((sum, card) => sum + (card.creditLimit || card.credit_limit || 0), 0);
            const totalBalance = cards.reduce((sum, card) => sum + card.currentBalance, 0);
            const totalAvailable = totalLimit - totalBalance;
            
            const cardsWithStatus = cards.map(card => {
                const limit = card.creditLimit || card.credit_limit || 0;
                return {
                    ...card,
                    availableLimit: getCardAvailableLimit(card),
                    utilizationPercentage: limit > 0 ? (card.currentBalance / limit) * 100 : 0,
                    status: limit > 0 && card.currentBalance / limit > 0.9 ? 'high' : 
                            limit > 0 && card.currentBalance / limit > 0.7 ? 'medium' : 'low'
                };
            });

            res.json({
                success: true,
                data: {
                    totalCards: cards.length,
                    totalLimit,
                    totalBalance,
                    totalAvailable,
                    averageUtilization: totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0,
                    cards: cardsWithStatus
                }
            });
        } catch (error) {
            console.error('Erro ao buscar resumo dos cartões:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar resumo dos cartões'
            });
        }
    }

    // Obter faturas próximas de vencer
    async getUpcomingInvoices(req: AuthRequest, res: Response) {
        try {
            const cards = await database.getCreditCards(req.user!.id);
            const today = new Date();
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            
            const upcomingInvoices = cards.filter(card => {
                const dueDate = new Date(card.dueDate);
                const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return daysUntilDue <= 30 && daysUntilDue >= 0;
            }).map(card => {
                const limit = card.creditLimit || card.credit_limit || 0;
                return {
                    ...card,
                    daysUntilDue: Math.ceil((new Date(card.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
                    utilizationPercentage: limit > 0 ? (card.currentBalance / limit) * 100 : 0
                };
            });

            res.json({
                success: true,
                data: {
                    totalUpcoming: upcomingInvoices.length,
                    totalAmount: upcomingInvoices.reduce((sum, card) => sum + card.currentBalance, 0),
                    invoices: upcomingInvoices
                }
            });
        } catch (error) {
            console.error('Erro ao buscar faturas próximas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar faturas próximas'
            });
        }
    }

    // Atualizar saldo do cartão
    async updateCardBalance(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { amount, operation } = req.body;
            
            if (!amount || !operation || !['add', 'subtract'].includes(operation)) {
                return res.status(400).json({
                    success: false,
                    error: 'Dados inválidos. Amount e operation são obrigatórios.'
                });
            }

            // Buscar cartão atual
            const cards = await database.getCreditCards(req.user!.id);
            const card = cards.find(c => c.id === parseInt(id));
            
            if (!card) {
                return res.status(404).json({
                    success: false,
                    error: 'Cartão não encontrado'
                });
            }

            // Calcular novo saldo
            const newBalance = operation === 'add' 
                ? card.currentBalance + amount 
                : card.currentBalance - amount;

            if (newBalance < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Novo saldo não pode ser negativo'
                });
            }

            const updated = await database.updateCreditCard(parseInt(id), {
                currentBalance: newBalance
            }, req.user!.id);
            
            if (!updated) {
                return res.status(400).json({
                    success: false,
                    error: 'Erro ao atualizar saldo do cartão'
                });
            }

            res.json({
                success: true,
                message: 'Saldo do cartão atualizado com sucesso',
                data: {
                    cardId: parseInt(id),
                    oldBalance: card.currentBalance,
                    newBalance,
                    operation
                }
            });
        } catch (error) {
            console.error('Erro ao atualizar saldo do cartão:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar saldo do cartão'
            });
        }
    }

    async importInvoice(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const cardId = parseInt(id);
            const cards = await database.getCreditCards(req.user!.id);
            const card = cards.find(c => c.id === cardId);

            if (!card) {
                return res.status(404).json({
                    success: false,
                    error: 'Cartão não encontrado'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Nenhum arquivo enviado'
                });
            }

            const result = await processStatement(req.file.buffer, req.file.mimetype, req.file.originalname, {
                forceType: 'expense',
                paymentMethod: 'credito',
                creditCardId: cardId,
                userId: req.user!.id
            });

            res.json({
                success: true,
                imported: result.imported,
                skipped: result.skipped,
                recognized: result.recognized,
                transactions: result.transactions,
                message: `${result.imported} compras importadas na fatura, ${result.skipped} duplicadas ignoradas`
            });
        } catch (error) {
            console.error('Erro ao importar fatura:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro ao importar fatura'
            });
        }
    }
}

export const creditCardController = new CreditCardController();
