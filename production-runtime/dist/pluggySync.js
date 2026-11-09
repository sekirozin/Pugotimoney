"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pluggyService_1 = require("./services/pluggyService");
(0, pluggyService_1.sincronizarPluggy)()
    .then((visao) => { process.stdout.write(`Sincronização MeuPluggy concluída.\n${(0, pluggyService_1.resumoSincronizacao)(visao)}\n`); })
    .catch(() => {
    process.stderr.write('Falha na sincronização MeuPluggy; os dados anteriores foram preservados.\n');
    process.exitCode = 1;
});
//# sourceMappingURL=pluggySync.js.map