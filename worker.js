// Cursor To OpenAI - Cloudflare Workers版本
// 基于原Express应用改编，支持一键部署到Cloudflare Workers

// 全局状态存储 (Workers KV替代本地文件存储)
let tokenStore = {
  tokens: [],
  password: '123',
  lastUsedIndex: 0
};

// 模型列表存储
let modelStore = [
  { id: "gpt-3.5-turbo", owned_by: "Cursor", name: "Cursor GPT-3.5" },
  { id: "claude-3-haiku-20240307", owned_by: "Cursor", name: "Cursor Claude 3 Haiku" },
  { id: "claude-3-opus-20240229", owned_by: "Cursor", name: "Cursor Claude 3 Opus" },
  { id: "claude-3-sonnet-20240229", owned_by: "Cursor", name: "Cursor Claude 3 Sonnet" },
  { id: "o1-preview-2023-12-13", owned_by: "Cursor", name: "Cursor o1-preview" },
  { id: "o1-mini-2023-12-13", owned_by: "Cursor", name: "Cursor o1-mini" }
];

// 生成UUID v4
function uuidv4() {
  return crypto.randomUUID();
}

// 生成哈希为64位十六进制
async function generateHashed64Hex(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 实用工具函数
async function generateCursorChecksum(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token.trim());
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return btoa(String.fromCharCode.apply(null, hashArray)).substring(0, 40);
}

// 获取所有令牌
function getTokens() {
  return tokenStore.tokens || [];
}

// 获取密码
function getPassword() {
  return tokenStore.password || '123';
}

// 获取下一个令牌（轮询方式）
function getNextToken() {
  const tokens = getTokens();
  if (tokens.length === 0) {
    return null;
  }
  
  let currentTokenIndex = tokenStore.lastUsedIndex || 0;
  
  // 如果当前索引超出范围，重置为0
  if (currentTokenIndex >= tokens.length) {
    currentTokenIndex = 0;
  }
  
  // 获取当前索引的令牌
  const token = tokens[currentTokenIndex];
  
  // 更新索引
  tokenStore.lastUsedIndex = (currentTokenIndex + 1) % tokens.length;
  
  return token.token;
}

// 验证API密钥
function validateApiKey(apiKey) {
  const password = getPassword();
  console.log(`验证API密钥: [${apiKey}], 存储密码: [${password}], 匹配结果: ${apiKey === password}`);
  return apiKey === password;
}

// 验证令牌是否有效
async function validateToken(token) {
  try {
    const authToken = token.includes('::') ? token.split('::')[1] : 
                      token.includes('%3A%3A') ? token.split('%3A%3A')[1] : token;
    
    const checksum = await generateCursorChecksum(authToken.trim());
    const clientKey = await generateHashed64Hex(authToken);
    const sessionid = uuidv4(); // 简化uuidv5实现
    const cursorClientVersion = "0.45.11";
    
    // 尝试调用Cursor API验证令牌
    const response = await fetch("https://api2.cursor.sh/aiserver.v1.AiService/AvailableModels", {
      method: 'POST',
      headers: {
        'accept-encoding': 'gzip',
        'authorization': `Bearer ${authToken}`,
        'connect-protocol-version': '1',
        'content-type': 'application/proto',
        'user-agent': 'connect-es/1.6.1',
        'x-amzn-trace-id': `Root=${uuidv4()}`,
        'x-client-key': clientKey,
        'x-cursor-checksum': checksum,
        'x-cursor-client-version': cursorClientVersion,
        'x-cursor-timezone': 'Asia/Shanghai',
        'x-ghost-mode': 'true',
        "x-request-id": uuidv4(),
        "x-session-id": sessionid,
        'Host': 'api2.cursor.sh',
      },
    });
    
    // 检查响应
    const data = await response.arrayBuffer();
    const text = new TextDecoder().decode(data);
    
    // 如果响应包含错误信息，则令牌无效
    if (text.includes('ERROR_NOT_LOGGED_IN') || text.includes('unauthenticated')) {
      console.log(`令牌验证失败: ${text}`);
      return false;
    }
    
    // 由于无法使用protobuf解码，简化验证逻辑
    return !text.includes('error');
  } catch (error) {
    console.error('验证令牌时出错:', error);
    return false;
  }
}

// 获取有效的令牌
async function getValidToken() {
  const tokens = getTokens();
  if (tokens.length === 0) {
    return null;
  }
  
  // 尝试轮询获取有效令牌
  for (let i = 0; i < tokens.length; i++) {
    const token = getNextToken();
    if (!token) continue;
    
    const isValid = await validateToken(token);
    if (isValid) {
      return token;
    } else {
      console.log(`令牌 ${token.substring(0, 20)}... 无效，尝试下一个`);
    }
  }
  
  return null;
}

// 获取支持的模型列表
function getSupportedModels() {
  return modelStore;
}

// 检查模型是否支持
function isModelSupported(modelId) {
  return modelStore.some(model => model.id === modelId);
}

// 获取模型信息
function getModelInfo(modelId) {
  return modelStore.find(model => model.id === modelId);
}

// 响应模型列表请求
async function handleModelsRequest(request) {
  return new Response(JSON.stringify({
    object: "list",
    data: getSupportedModels()
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// 响应管理页面请求
async function handleAdminRequest(request) {
  // 简化版管理界面HTML
  const html = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cursor To OpenAI - 管理控制台</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
      .container { max-width: 800px; margin: 0 auto; }
      .card { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
      input, button { padding: 8px; margin: 5px 0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
      .error { color: red; }
      .success { color: green; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Cursor To OpenAI - 管理控制台</h1>
      <p>当前仅支持通过Cloudflare Workers界面管理令牌。请使用Workers KV或Durable Objects进行存储管理。</p>
      
      <div class="card">
        <h2>API 信息</h2>
        <p>API地址: <code>https://your-worker-url/v1/chat/completions</code></p>
        <p>当前密码: <code>${getPassword()}</code></p>
      </div>
      
      <div class="card">
        <h2>令牌状态</h2>
        <p>存储的令牌数量: ${getTokens().length}</p>
      </div>
    </div>
  </body>
  </html>
  `;
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html'
    }
  });
}

// 处理聊天补全请求
async function handleChatCompletions(request) {
  try {
    const body = await request.json();
    const { model, messages, stream = false } = body;
    
    // o1开头的模型，不支持流式输出
    if (model.startsWith('o1-') && stream) {
      return new Response(JSON.stringify({
        error: 'Model not supported stream',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 检查模型是否支持
    if (!isModelSupported(model)) {
      return new Response(JSON.stringify({
        error: `Model ${model} is not supported`,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 从请求头中获取授权信息
    let bearerToken = request.headers.get('authorization')?.replace('Bearer ', '');
    let authToken;
    let isApiKeyAuth = false;
    
    // 如果提供了有效的API密钥，标记为API密钥认证
    if (bearerToken && validateApiKey(bearerToken)) {
      isApiKeyAuth = true;
      // 获取有效的令牌用于调用Cursor API
      const validToken = await getValidToken();
      if (!validToken) {
        return new Response(JSON.stringify({
          error: '系统中没有有效的Cursor令牌，无法完成请求'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      authToken = validToken;
    } 
    // 否则检查提供的令牌是否有效
    else if (bearerToken) {
      const isValid = await validateToken(bearerToken);
      if (!isValid) {
        return new Response(JSON.stringify({
          error: '提供的令牌无效'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      authToken = bearerToken;
    } 
    // 未提供令牌则返回错误
    else {
      return new Response(JSON.stringify({
        error: '未提供有效的认证令牌'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 这里简化处理，返回一个模拟的响应
    // 实际实现中应该调用Cursor的API进行聊天
    return new Response(JSON.stringify({
      id: `chatcmpl-${uuidv4()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "这是Cloudflare Workers版本的Cursor To OpenAI应用。请完成实际的API调用实现。"
          },
          finish_reason: "stop"
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('处理聊天请求时出错:', error);
    return new Response(JSON.stringify({
      error: '处理请求时出错'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 路由请求处理
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // API 路由
  if (path === '/v1/models') {
    return handleModelsRequest(request);
  }
  
  if (path === '/v1/chat/completions') {
    return handleChatCompletions(request);
  }
  
  // 管理页面
  if (path === '/admin') {
    return handleAdminRequest(request);
  }
  
  // 首页
  if (path === '/' || path === '') {
    return new Response(`
      <html>
        <head>
          <title>Cursor To OpenAI - Cloudflare Workers</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; text-align: center; }
            .container { max-width: 800px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Cursor To OpenAI</h1>
            <p>Cloudflare Workers 版本</p>
            <p>API端点: /v1/chat/completions</p>
            <p><a href="/admin">管理页面</a></p>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // 404 - 页面不存在
  return new Response('Not Found', { status: 404 });
}

// Worker 入口点
export default {
  async fetch(request, env, ctx) {
    // 从 KV 或环境变量中加载存储数据
    try {
      // 如果环境中存在 KV 绑定，则从 KV 加载数据
      if (env.TOKEN_STORE) {
        const storedTokens = await env.TOKEN_STORE.get('tokens');
        if (storedTokens) {
          tokenStore = JSON.parse(storedTokens);
        }
      }
    } catch (error) {
      console.error('加载令牌存储时出错:', error);
    }
    
    return handleRequest(request);
  }
}; 