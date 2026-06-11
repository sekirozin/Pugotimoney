import { Request, Response } from 'express';
import { database } from '../models/database';
import { getInstallmentStatus } from '../utils/helpers';
import { AuthRequest } from '../middleware/auth';

export class InstallmentController {
    // Obter todos os parcelamentos
    async getInstallments(req: AuthRequest, res: Response) {
        try {
            const installments = await database.getInstallments(req.user!.id);
            
            // Adicionar status detalhado a cada parcelamento
            const installmentsWithStatus = installments.map(installment => ({
                ...installment,
                status: getInstallmentStatus(installment)
            }));
            
            res.json({
                success: true,
                data: installmentsWithStatus,
                total: installments.length
            });
        } catch (error) {
            console.error('Erro ao buscar parcelamentos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar parcelamentos'
            });
        }
    }

    // Adicionar novo parcelamento
    async addInstallment(req: AuthRequest, res: Response) {
        try {
            const installmentData = req.body;
            
            const installmentId = await database.addInstallment(installmentData, req.user!.id);
            
            res.status(201).json({
                success: true,
                data: { id: installmentId, ...installmentData },
                message: 'Parcelamento adicionado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao adicionar parcelamento:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao adicionar parcelamento'
            });
        }
    }

    // Atualizar parcelamento
    async updateInstallment(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const updates = req.body;
            
            const updated = await database.updateInstallment(parseInt(id), updates, req.user!.id);
            
            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: 'Parcelamento não encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Parcelamento atualizado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao atualizar parcelamento:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar parcelamento'
            });
        }
    }

    // Excluir parcelamento
    async deleteInstallment(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            
            const deleted = await database.deleteInstallment(parseInt(id), req.user!.id);
            
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Parcelamento não encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Parcelamento excluído com sucesso'
            });
        } catch (error) {
            console.error('Erro ao excluir parcelamento:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao excluir parcelamento'
            });
        }
    }

    // Obter parcelamentos próximos
    async getUpcomingInstallments(req: AuthRequest, res: Response) {
        try {
            const installments = await database.getInstallments(req.user!.id);
            const today = new Date();
            
            const upcoming = installments
                .filter(installment => {
                    const status = getInstallmentStatus(installment);
                    return !status.isCompleted && installment.currentInstallment < installment.totalInstallments;
                })
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .slice(0, 10);

            res.json({
                success: true,
                data: {
                    totalUpcoming: upcoming.length,
                    totalAmount: upcoming.reduce((sum, i) => sum + i.installmentAmount, 0),
                    installments: upcoming
                }
            });
        } catch (error) {
            console.error('Erro ao buscar parcelamentos próximos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar parcelamentos próximos'
            });
        }
    }

    // Obter parcelamentos concluídos
    async getCompletedInstallments(req: AuthRequest, res: Response) {
        try {
            const installments = await database.getInstallments(req.user!.id);
            
            const completed = installments
                .filter(installment => {
                    const status = getInstallmentStatus(installment);
                    return status.isCompleted;
                });

            res.json({
                success: true,
                data: {
                    totalCompleted: completed.length,
                    totalAmount: completed.reduce((sum, i) => sum + i.totalAmount, 0),
                    installments: completed
                }
            });
        } catch (error) {
            console.error('Erro ao buscar parcelamentos concluídos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar parcelamentos concluídos'
            });
        }
    }

    // Marcar parcelamento como pago
    async markInstallmentAsPaid(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            
            // Buscar parcelamento atual
            const installments = await database.getInstallments(req.user!.id);
            const installment = installments.find(i => i.id === parseInt(id));
            
            if (!installment) {
                return res.status(404).json({
                    success: false,
                    error: 'Parcelamento não encontrado'
                });
            }

            const status = getInstallmentStatus(installment);
            if (status.isCompleted) {
                return res.status(400).json({
                    success: false,
                    error: 'Parcelamento já está concluído'
                });
            }

            // Só permitir avançar uma parcela por vez
            const newCurrentInstallment = installment.currentInstallment + 1;
            if (newCurrentInstallment > installment.totalInstallments) {
                return res.status(400).json({
                    success: false,
                    error: 'Todas as parcelas já foram pagas'
                });
            }

            const updated = await database.updateInstallmentCurrentInstallment(
                parseInt(id),
                newCurrentInstallment,
                req.user!.id
            );
            
            if (!updated) {
                return res.status(400).json({
                    success: false,
                    error: 'Erro ao atualizar parcelamento'
                });
            }

            res.json({
                success: true,
                message: `Parcelamento ${newCurrentInstallment}/${installment.totalInstallments} marcado como pago`,
                data: {
                    installmentId: parseInt(id),
                    currentInstallment: newCurrentInstallment,
                    isCompleted: newCurrentInstallment >= installment.totalInstallments
                }
            });
        } catch (error) {
            console.error('Erro ao marcar parcelamento como pago:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao marcar parcelamento como pago'
            });
        }
    }
}

export const installmentController = new InstallmentController();
