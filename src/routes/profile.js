"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profileController_1 = require("../controllers/profileController");
const router = (0, express_1.Router)();
router.get('/', profileController_1.getProfile);
router.put('/', profileController_1.updateProfile);
exports.default = router;
//# sourceMappingURL=profile.js.map