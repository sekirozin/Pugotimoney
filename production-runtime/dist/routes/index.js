"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Rota de teste
router.get('/test', (req, res) => {
    res.json({ message: 'API está funcionando!' });
});
exports.default = router;
//# sourceMappingURL=index.js.map