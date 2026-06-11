export declare const uploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
type ProcessStatementOptions = {
    forceType?: 'income' | 'expense';
    paymentMethod?: string;
    creditCardId?: number;
};
export declare function processStatement(buffer: Buffer, mimeType?: string, filename?: string, options?: ProcessStatementOptions): Promise<{
    imported: number;
    skipped: number;
    transactions: any[];
    recognized: number;
}>;
export declare function previewStatement(buffer: Buffer, mimeType?: string, filename?: string): Promise<{
    recognized: number;
    transactions: any[];
}>;
export {};
//# sourceMappingURL=statementService.d.ts.map