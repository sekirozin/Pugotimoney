export declare function lerChave(texto: string): Buffer;
export declare function criptografar(valor: unknown, chave: Buffer, usuario: string): string;
export declare function descriptografar(texto: string, chave: Buffer, usuario: string): unknown;
export declare function lerSegredo(diretorio: string, nome: string): Promise<string>;
export declare function salvarCifrado(arquivo: string, conteudo: string): Promise<void>;
export declare function lerCifrado(arquivo: string): Promise<string | null>;
//# sourceMappingURL=pluggyVault.d.ts.map