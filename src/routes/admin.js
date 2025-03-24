const express = require('express');
const router = express.Router();
const { isAuthenticated, authenticate } = require('../utils/authMiddleware');
const { getTokens, addToken, deleteToken, getPassword, updatePassword, getTokenRotationStatus } = require('../utils/tokenStore');
const { getSupportedModels, addModel, deleteModel, resetModels } = require('../utils/modelList');

// 登录页面
router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// 处理登录请求
router.post('/login', authenticate);

// 登出
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// 管理界面首页
router.get('/', isAuthenticated, (req, res) => {
    const tokens = getTokens();
    const password = getPassword();
    const models = getSupportedModels();
    const rotationStatus = getTokenRotationStatus();
    res.render('admin', { tokens, password, models, rotationStatus, message: req.query.message });
});

// 添加令牌
router.post('/tokens', isAuthenticated, (req, res) => {
    const { name, token } = req.body;
    
    if (!name || !token) {
        return res.redirect('/admin?message=名称和令牌不能为空');
    }
    
    addToken(name, token);
    res.redirect('/admin?message=令牌添加成功');
});

// 删除令牌
router.post('/tokens/delete', isAuthenticated, (req, res) => {
    const { name } = req.body;
    
    if (!name) {
        return res.redirect('/admin?message=请指定要删除的令牌名称');
    }
    
    deleteToken(name);
    res.redirect('/admin?message=令牌删除成功');
});

// 更新密码
router.post('/password', isAuthenticated, (req, res) => {
    const { newPassword, confirmPassword } = req.body;
    
    if (!newPassword || newPassword !== confirmPassword) {
        return res.redirect('/admin?message=新密码不能为空或两次输入不一致');
    }
    
    updatePassword(newPassword);
    res.redirect('/admin?message=密码更新成功');
});

// 添加模型
router.post('/models', isAuthenticated, (req, res) => {
    const { modelId, provider } = req.body;
    
    if (!modelId || !provider) {
        return res.redirect('/admin?message=模型ID和提供商不能为空');
    }
    
    const success = addModel(modelId, provider);
    if (success) {
        res.redirect('/admin?message=模型添加成功');
    } else {
        res.redirect('/admin?message=模型添加失败，可能已存在相同ID的模型');
    }
});

// 删除模型
router.post('/models/delete', isAuthenticated, (req, res) => {
    const { modelId } = req.body;
    
    if (!modelId) {
        return res.redirect('/admin?message=请指定要删除的模型ID');
    }
    
    const success = deleteModel(modelId);
    if (success) {
        res.redirect('/admin?message=模型删除成功');
    } else {
        res.redirect('/admin?message=模型删除失败');
    }
});

// 重置模型列表
router.post('/models/reset', isAuthenticated, (req, res) => {
    const success = resetModels();
    if (success) {
        res.redirect('/admin?message=模型列表已重置为默认值');
    } else {
        res.redirect('/admin?message=模型列表重置失败');
    }
});

module.exports = router; 