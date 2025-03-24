const fs = require('fs');
const path = require('path');

// 存储模型的文件路径
const MODEL_FILE = path.join(__dirname, '../../data/models.json');

// 默认模型列表
const defaultModels = [
    {
        id: 'claude-3-5-sonnet-20241022',
        created: Date.now(),
        object: 'model',
        owned_by: 'anthropic'
    },
    {
        id: 'claude-3-opus',
        created: Date.now(),
        object: 'model',
        owned_by: 'anthropic'
    },
    {
        id: 'claude-3-5-haiku',
        created: Date.now(),
        object: 'model',
        owned_by: 'anthropic'
    },
    {
        id: 'claude-3-5-sonnet',
        created: Date.now(),
        object: 'model',
        owned_by: 'anthropic'
    },
    {
        id: 'claude-3-7-sonnet',
        created: Date.now(),
        object: 'model',
        owned_by: 'anthropic'
    },
    {
        id: 'claude-3-7-sonnet-thinking',
        created: Date.now(),
        object: 'model',
        owned_by: 'anthropic'
    },
    {
        id: 'cursor-small',
        created: Date.now(),
        object: 'model',
        owned_by: 'cursor'
    },
    {
        id: 'gemini-exp-1206',
        created: Date.now(),
        object: 'model',
        owned_by: 'google'
    },
    {
        id: 'gemini-2.0-flash-exp',
        created: Date.now(),
        object: 'model',
        owned_by: 'google'
    },
    {
        id: 'gemini-2.0-flash-thinking-exp',
        created: Date.now(),
        object: 'model',
        owned_by: 'google'
    },
    {
        id: 'gpt-3.5-turbo',
        created: Date.now(),
        object: 'model',
        owned_by: 'openai'
    },
    {
        id: 'gpt-4',
        created: Date.now(),
        object: 'model',
        owned_by: 'openai'
    },
    {
        id: 'gpt-4.5-preview',
        created: Date.now(),
        object: 'model',
        owned_by: 'openai'
    },
    {
        id: 'gpt-4-turbo-2024-04-09',
        created: Date.now(),
        object: 'model',
        owned_by: 'openai'
    },
    {
        id: 'gpt-4o',
        created: Date.now(),
        object: 'model',
        owned_by: 'openai'
    },
    {
        id: 'gpt-4o-mini',
        created: Date.now(),
        object: 'model',
        owned_by: 'openai'
    },
    {
        id: 'o1-mini',
        created: Date.now(),
        object: 'model',
        owned_by: 'o1'
    },
    {
        id: 'o1-preview',
        created: Date.now(),
        object: 'model',
        owned_by: 'o1'
    }
];

// 确保数据目录存在
const ensureDataDir = () => {
    const dataDir = path.dirname(MODEL_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
};

// 初始化模型存储
const initModelStore = () => {
    ensureDataDir();
    if (!fs.existsSync(MODEL_FILE)) {
        fs.writeFileSync(MODEL_FILE, JSON.stringify({
            models: defaultModels
        }, null, 2), 'utf8');
    }
};

/**
 * 获取支持的模型列表
 * @returns {Array} 模型列表
 */
const getSupportedModels = () => {
    initModelStore();
    try {
        const data = JSON.parse(fs.readFileSync(MODEL_FILE, 'utf8'));
        return data.models || [];
    } catch (error) {
        console.error('读取模型列表失败:', error);
        return defaultModels;
    }
};

/**
 * 检查模型是否支持
 * @param {string} modelId 模型ID
 * @returns {boolean} 是否支持
 */
const isModelSupported = (modelId) => {
    const models = getSupportedModels();
    return models.some(model => model.id === modelId);
};

/**
 * 获取模型信息
 * @param {string} modelId 模型ID
 * @returns {Object|null} 模型信息
 */
const getModelInfo = (modelId) => {
    const models = getSupportedModels();
    return models.find(model => model.id === modelId) || null;
};

/**
 * 添加模型
 * @param {string} modelId 模型ID
 * @param {string} provider 提供商
 * @returns {boolean} 是否成功
 */
const addModel = (modelId, provider) => {
    if (!modelId || !provider) {
        return false;
    }
    
    initModelStore();
    try {
        const data = JSON.parse(fs.readFileSync(MODEL_FILE, 'utf8'));
        
        // 检查是否已存在相同ID的模型
        if (data.models.some(model => model.id === modelId)) {
            return false;
        }
        
        // 添加新模型
        data.models.push({
            id: modelId,
            created: Date.now(),
            object: 'model',
            owned_by: provider
        });
        
        fs.writeFileSync(MODEL_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('添加模型失败:', error);
        return false;
    }
};

/**
 * 删除模型
 * @param {string} modelId 模型ID
 * @returns {boolean} 是否成功
 */
const deleteModel = (modelId) => {
    if (!modelId) {
        return false;
    }
    
    initModelStore();
    try {
        const data = JSON.parse(fs.readFileSync(MODEL_FILE, 'utf8'));
        
        // 过滤掉要删除的模型
        data.models = data.models.filter(model => model.id !== modelId);
        
        fs.writeFileSync(MODEL_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('删除模型失败:', error);
        return false;
    }
};

/**
 * 重置模型列表为默认值
 * @returns {boolean} 是否成功
 */
const resetModels = () => {
    ensureDataDir();
    try {
        fs.writeFileSync(MODEL_FILE, JSON.stringify({
            models: defaultModels
        }, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('重置模型列表失败:', error);
        return false;
    }
};

module.exports = {
    getSupportedModels,
    isModelSupported,
    getModelInfo,
    addModel,
    deleteModel,
    resetModels,
    initModelStore
}; 