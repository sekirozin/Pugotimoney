"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
const express_1 = require("express");
const database_1 = require("../models/database");
const db = new database_1.Database();
async function getProfile(req, res) {
    try {
        const user = await db.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
async function updateProfile(req, res) {
    try {
        const { bio, location, avatar_url } = req.body;
        await db.updateProfile(req.user.id, { bio, location, avatar_url });
        const user = await db.getUserById(req.user.id);
        res.json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
//# sourceMappingURL=profileController.js.map