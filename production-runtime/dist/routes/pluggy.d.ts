import { AuthRequest } from '../middleware/auth';
declare const router: import("express-serve-static-core").Router;
/** O pedido é do dono das contas conectadas, com o mesmo usuário no token e na sessão do PugotiLab. Lança se a sessão for inválida. */
export declare function donoDasContas(req: AuthRequest): boolean;
export declare const filtroBancos: (valor: unknown) => Set<string> | undefined;
export default router;
//# sourceMappingURL=pluggy.d.ts.map