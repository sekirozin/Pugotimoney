import { resumoSincronizacao, sincronizarPluggy } from './services/pluggyService';

sincronizarPluggy()
    .then((visao) => { process.stdout.write(`Sincronização MeuPluggy concluída.\n${resumoSincronizacao(visao)}\n`); })
    .catch(() => {
        process.stderr.write('Falha na sincronização MeuPluggy; os dados anteriores foram preservados.\n');
        process.exitCode = 1;
    });
