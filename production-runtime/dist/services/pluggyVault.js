"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lerChave = lerChave;
exports.criptografar = criptografar;
exports.descriptografar = descriptografar;
exports.lerSegredo = lerSegredo;
exports.salvarCifrado = salvarCifrado;
exports.lerCifrado = lerCifrado;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const VERSAO = 1;
const TAMANHO_CHAVE = 32;
function lerChave(texto) {
    const chave = Buffer.from(texto.trim(), 'base64');
    if (chave.length !== TAMANHO_CHAVE || chave.toString('base64') !== texto.trim()) {
        throw new Error('Chave de criptografia inválida');
    }
    return chave;
}
function criptografar(valor, chave, usuario) {
    if (chave.length !== TAMANHO_CHAVE || !usuario)
        throw new Error('Parâmetros de criptografia inválidos');
    const iv = (0, node_crypto_1.randomBytes)(12);
    const cifra = (0, node_crypto_1.createCipheriv)('aes-256-gcm', chave, iv);
    cifra.setAAD(Buffer.from(`pugotimoney:pluggy:v${VERSAO}:${usuario}`, 'utf8'));
    const conteudo = Buffer.concat([cifra.update(JSON.stringify(valor), 'utf8'), cifra.final()]);
    return JSON.stringify({ v: VERSAO, iv: iv.toString('base64'), tag: cifra.getAuthTag().toString('base64'), dados: conteudo.toString('base64') });
}
function descriptografar(texto, chave, usuario) {
    if (chave.length !== TAMANHO_CHAVE || !usuario)
        throw new Error('Parâmetros de criptografia inválidos');
    const pacote = JSON.parse(texto);
    if (pacote?.v !== VERSAO || typeof pacote.iv !== 'string' || typeof pacote.tag !== 'string' || typeof pacote.dados !== 'string') {
        throw new Error('Formato de dados criptografados inválido');
    }
    const iv = Buffer.from(pacote.iv, 'base64');
    const tag = Buffer.from(pacote.tag, 'base64');
    if (iv.length !== 12 || tag.length !== 16)
        throw new Error('Formato de dados criptografados inválido');
    const cifra = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', chave, iv);
    cifra.setAAD(Buffer.from(`pugotimoney:pluggy:v${VERSAO}:${usuario}`, 'utf8'));
    cifra.setAuthTag(tag);
    const conteudo = Buffer.concat([cifra.update(Buffer.from(pacote.dados, 'base64')), cifra.final()]);
    return JSON.parse(conteudo.toString('utf8'));
}
async function lerSegredo(diretorio, nome) {
    const pasta = await node_fs_1.promises.lstat(diretorio);
    if (!pasta.isDirectory() || (pasta.mode & 0o077) !== 0)
        throw new Error('Diretório de segredos precisa ser privado');
    const arquivo = node_path_1.default.join(diretorio, nome);
    const info = await node_fs_1.promises.lstat(arquivo);
    if (!info.isFile() || info.size > 4096 || (info.mode & 0o077) !== 0)
        throw new Error('Arquivo de segredo precisa ser privado');
    const valor = (await node_fs_1.promises.readFile(arquivo, 'utf8')).trim();
    if (!valor)
        throw new Error('Arquivo de segredo vazio');
    return valor;
}
async function salvarCifrado(arquivo, conteudo) {
    const pasta = node_path_1.default.dirname(arquivo);
    await node_fs_1.promises.mkdir(pasta, { recursive: true, mode: 0o700 });
    const info = await node_fs_1.promises.lstat(pasta);
    if (!info.isDirectory() || (info.mode & 0o077) !== 0)
        throw new Error('Diretório financeiro precisa ser privado');
    const temporario = `${arquivo}.${(0, node_crypto_1.randomBytes)(8).toString('hex')}.tmp`;
    try {
        await node_fs_1.promises.writeFile(temporario, conteudo, { mode: 0o600, flag: 'wx' });
        await node_fs_1.promises.rename(temporario, arquivo);
    }
    finally {
        await node_fs_1.promises.rm(temporario, { force: true });
    }
}
async function lerCifrado(arquivo) {
    try {
        const info = await node_fs_1.promises.lstat(arquivo);
        if (!info.isFile() || (info.mode & 0o077) !== 0)
            throw new Error('Arquivo financeiro precisa ser privado');
        return await node_fs_1.promises.readFile(arquivo, 'utf8');
    }
    catch (erro) {
        if (erro.code === 'ENOENT')
            return null;
        throw erro;
    }
}
//# sourceMappingURL=pluggyVault.js.map