import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const VERSAO = 1;
const TAMANHO_CHAVE = 32;

export function lerChave(texto: string): Buffer {
    const chave = Buffer.from(texto.trim(), 'base64');
    if (chave.length !== TAMANHO_CHAVE || chave.toString('base64') !== texto.trim()) {
        throw new Error('Chave de criptografia inválida');
    }
    return chave;
}

export function criptografar(valor: unknown, chave: Buffer, usuario: string): string {
    if (chave.length !== TAMANHO_CHAVE || !usuario) throw new Error('Parâmetros de criptografia inválidos');
    const iv = randomBytes(12);
    const cifra = createCipheriv('aes-256-gcm', chave, iv);
    cifra.setAAD(Buffer.from(`pugotimoney:pluggy:v${VERSAO}:${usuario}`, 'utf8'));
    const conteudo = Buffer.concat([cifra.update(JSON.stringify(valor), 'utf8'), cifra.final()]);
    return JSON.stringify({ v: VERSAO, iv: iv.toString('base64'), tag: cifra.getAuthTag().toString('base64'), dados: conteudo.toString('base64') });
}

export function descriptografar(texto: string, chave: Buffer, usuario: string): unknown {
    if (chave.length !== TAMANHO_CHAVE || !usuario) throw new Error('Parâmetros de criptografia inválidos');
    const pacote = JSON.parse(texto);
    if (pacote?.v !== VERSAO || typeof pacote.iv !== 'string' || typeof pacote.tag !== 'string' || typeof pacote.dados !== 'string') {
        throw new Error('Formato de dados criptografados inválido');
    }
    const iv = Buffer.from(pacote.iv, 'base64');
    const tag = Buffer.from(pacote.tag, 'base64');
    if (iv.length !== 12 || tag.length !== 16) throw new Error('Formato de dados criptografados inválido');
    const cifra = createDecipheriv('aes-256-gcm', chave, iv);
    cifra.setAAD(Buffer.from(`pugotimoney:pluggy:v${VERSAO}:${usuario}`, 'utf8'));
    cifra.setAuthTag(tag);
    const conteudo = Buffer.concat([cifra.update(Buffer.from(pacote.dados, 'base64')), cifra.final()]);
    return JSON.parse(conteudo.toString('utf8'));
}

export async function lerSegredo(diretorio: string, nome: string): Promise<string> {
    const pasta = await fs.lstat(diretorio);
    if (!pasta.isDirectory() || (pasta.mode & 0o077) !== 0) throw new Error('Diretório de segredos precisa ser privado');
    const arquivo = path.join(diretorio, nome);
    const info = await fs.lstat(arquivo);
    if (!info.isFile() || info.size > 4096 || (info.mode & 0o077) !== 0) throw new Error('Arquivo de segredo precisa ser privado');
    const valor = (await fs.readFile(arquivo, 'utf8')).trim();
    if (!valor) throw new Error('Arquivo de segredo vazio');
    return valor;
}

export async function salvarCifrado(arquivo: string, conteudo: string): Promise<void> {
    const pasta = path.dirname(arquivo);
    await fs.mkdir(pasta, { recursive: true, mode: 0o700 });
    const info = await fs.lstat(pasta);
    if (!info.isDirectory() || (info.mode & 0o077) !== 0) throw new Error('Diretório financeiro precisa ser privado');
    const temporario = `${arquivo}.${randomBytes(8).toString('hex')}.tmp`;
    try {
        await fs.writeFile(temporario, conteudo, { mode: 0o600, flag: 'wx' });
        await fs.rename(temporario, arquivo);
    } finally {
        await fs.rm(temporario, { force: true });
    }
}

export async function lerCifrado(arquivo: string): Promise<string | null> {
    try {
        const info = await fs.lstat(arquivo);
        if (!info.isFile() || (info.mode & 0o077) !== 0) throw new Error('Arquivo financeiro precisa ser privado');
        return await fs.readFile(arquivo, 'utf8');
    } catch (erro) {
        if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw erro;
    }
}
