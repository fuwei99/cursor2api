const fs = require('fs');
const path = require('path');

// 存储令牌的文件路径
const TOKEN_FILE = path.join(__dirname, '../../data/tokens.json');

// 当前令牌索引（用于轮询）
let currentTokenIndex = 0;

// 确保数据目录存在
const ensureDataDir = () => {
    const dataDir = path.dirname(TOKEN_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
};

// 初始化令牌存储
const initTokenStore = () => {
    ensureDataDir();
    if (!fs.existsSync(TOKEN_FILE)) {
        fs.writeFileSync(TOKEN_FILE, JSON.stringify({
            tokens: [],
            password: '123', // 默认密码
            lastUsedIndex: 0 // 上次使用的令牌索引
        }), 'utf8');
    } else {
        // 从文件中读取上次使用的索引
        try {
            const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
            currentTokenIndex = data.lastUsedIndex || 0;
        } catch (error) {
            console.error('读取令牌索引失败:', error);
            currentTokenIndex = 0;
        }
    }
};

// 获取所有令牌
const getTokens = () => {
    initTokenStore();
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    return data.tokens || [];
};

// 添加令牌
const addToken = (name, token) => {
    initTokenStore();
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    
    // 检查是否已存在相同名称的令牌
    const existingIndex = data.tokens.findIndex(t => t.name === name);
    if (existingIndex >= 0) {
        data.tokens[existingIndex] = { name, token };
    } else {
        data.tokens.push({ name, token });
    }
    
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
};

// 删除令牌
const deleteToken = (name) => {
    initTokenStore();
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    data.tokens = data.tokens.filter(t => t.name !== name);
    
    // 重置当前索引，如果删除后索引超出范围
    if (currentTokenIndex >= data.tokens.length && data.tokens.length > 0) {
        currentTokenIndex = 0;
        data.lastUsedIndex = currentTokenIndex;
    }
    
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
};

// 获取密码
const getPassword = () => {
    initTokenStore();
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    return data.password || '123';
};

// 更新密码
const updatePassword = (newPassword) => {
    initTokenStore();
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    data.password = newPassword;
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
};

// 获取下一个令牌（轮询方式）
const getNextToken = () => {
    const tokens = getTokens();
    if (tokens.length === 0) {
        return null;
    }
    
    // 如果当前索引超出范围，重置为0
    if (currentTokenIndex >= tokens.length) {
        currentTokenIndex = 0;
    }
    
    // 获取当前索引的令牌
    const token = tokens[currentTokenIndex];
    
    // 更新索引并保存到文件
    currentTokenIndex = (currentTokenIndex + 1) % tokens.length;
    
    // 保存当前索引到文件
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    data.lastUsedIndex = currentTokenIndex;
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), 'utf8');
    
    return token.token;
};

// 获取当前轮询状态
const getTokenRotationStatus = () => {
    const tokens = getTokens();
    if (tokens.length === 0) {
        return {
            totalTokens: 0,
            currentIndex: 0,
            nextIndex: 0
        };
    }
    
    return {
        totalTokens: tokens.length,
        currentIndex: currentTokenIndex,
        nextIndex: (currentTokenIndex + 1) % tokens.length,
        currentToken: tokens[currentTokenIndex % tokens.length]?.name || '无',
        nextToken: tokens[(currentTokenIndex + 1) % tokens.length]?.name || '无'
    };
};

module.exports = {
    getTokens,
    addToken,
    deleteToken,
    getPassword,
    updatePassword,
    initTokenStore,
    getNextToken,
    getTokenRotationStatus
}; 