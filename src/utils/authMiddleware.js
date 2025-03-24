const { getPassword } = require('./tokenStore');

// 检查用户是否已登录
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.isAuthenticated) {
        return next();
    }
    return res.redirect('/admin/login');
};

// 验证登录凭据
const authenticate = (req, res, next) => {
    const { password } = req.body;
    const storedPassword = getPassword();
    
    if (password === storedPassword) {
        req.session.isAuthenticated = true;
        return res.redirect('/admin');
    }
    
    return res.render('login', { error: '密码错误，请重试' });
};

module.exports = {
    isAuthenticated,
    authenticate
}; 