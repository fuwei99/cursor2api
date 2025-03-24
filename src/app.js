const express = require('express');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const app = express();

const config = require('./config/config');
const routes = require('./routes');
const { initTokenStore } = require('./utils/tokenStore');
const { initModelStore } = require('./utils/modelList');

// 初始化令牌存储
initTokenStore();

// 初始化模型存储
initModelStore();

// 设置视图引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan(process.env.MORGAN_FORMAT ?? 'tiny'));

// 会话中间件
app.use(session({
    secret: process.env.SESSION_SECRET || config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

// 路由
app.use("/", routes);

// 使用环境变量端口
const port = process.env.PORT || config.port;

// 启动服务器
app.listen(port, () => {
    console.log(`服务器已启动，监听端口: ${port}`);
    console.log(`管理界面: http://localhost:${port}/admin`);
    console.log(`默认密码: ${config.defaultPassword}`);
});
