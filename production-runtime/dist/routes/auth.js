"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/sso', authController_1.authController.sso);
router.get('/me', auth_1.authMiddleware, authController_1.authController.me);
exports.default = router;
//# sourceMappingURL=auth.js.map