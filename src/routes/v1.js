const express = require('express');
const router = express.Router();

const $root = require('../proto/message.js');
const { v4: uuidv4, v5: uuidv5 } = require('uuid');
const { generateCursorBody, chunkToUtf8String, generateHashed64Hex, generateCursorChecksum } = require('../utils/utils.js');
const { getTokens, getPassword, getNextToken, deleteToken } = require('../utils/tokenStore');
const { getSupportedModels, isModelSupported, getModelInfo } = require('../utils/modelList');

// 验证API密钥
const validateApiKey = (apiKey) => {
  // 如果API密钥与当前密码匹配，则允许访问
  const password = getPassword();
  console.log(`验证API密钥: [${apiKey}], 存储密码: [${password}], 匹配结果: ${apiKey === password}`);
  return apiKey === password;
};

// 验证令牌是否有效
const validateToken = async (token) => {
  try {
    const authToken = token.includes('::') ? token.split('::')[1] : 
                     token.includes('%3A%3A') ? token.split('%3A%3A')[1] : token;
    
    const checksum = generateCursorChecksum(authToken.trim());
    const clientKey = generateHashed64Hex(authToken);
    const sessionid = uuidv5(authToken, uuidv5.DNS);
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
    const buffer = Buffer.from(data);
    const text = buffer.toString('utf-8');
    
    // 如果响应包含错误信息，则令牌无效
    if (text.includes('ERROR_NOT_LOGGED_IN') || text.includes('unauthenticated')) {
      console.log(`令牌验证失败: ${text}`);
      return false;
    }
    
    // 尝试解码响应
    try {
      const models = $root.AvailableModelsResponse.decode(buffer).models;
      return models && models.length > 0;
    } catch (error) {
      console.error('解码响应失败:', error);
      return false;
    }
  } catch (error) {
    console.error('验证令牌时出错:', error);
    return false;
  }
};

// 获取有效的令牌
const getValidToken = async () => {
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
};

router.get("/models", async (req, res) => {
  try {
    // 直接返回支持的模型列表
    return res.json({
      object: "list",
      data: getSupportedModels()
    });
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

router.post('/chat/completions', async (req, res) => {
  // o1开头的模型，不支持流式输出
  if (req.body.model.startsWith('o1-') && req.body.stream) {
    return res.status(400).json({
      error: 'Model not supported stream',
    });
  }

  try {
    const { model, messages, stream = false } = req.body;
    
    // 检查模型是否支持
    if (!isModelSupported(model)) {
      return res.status(400).json({
        error: `Model ${model} is not supported`,
      });
    }
    
    // 从请求头中获取授权信息
    let bearerToken = req.headers.authorization?.replace('Bearer ', '');
    let authToken;
    let isApiKeyAuth = false;
    
    // 如果提供了有效的API密钥，标记为API密钥认证
    if (bearerToken && validateApiKey(bearerToken)) {
      isApiKeyAuth = true;
      // 获取有效的令牌用于调用Cursor API
      const validToken = await getValidToken();
      if (!validToken) {
        return res.status(401).json({
          error: '系统中没有有效的Cursor令牌，无法完成请求'
        });
      }
      authToken = validToken;
    } 
    // 否则检查提供的令牌是否有效
    else if (bearerToken) {
      authToken = bearerToken;
    }
    // 如果没有提供任何认证信息，尝试使用轮询方式获取令牌
    else {
      const validToken = await getValidToken();
      if (!validToken) {
        return res.status(401).json({
          error: '未提供有效的API密钥，且没有找到有效的JWT令牌'
        });
      }
      authToken = validToken;
    }
    
    // 处理令牌格式
    if (authToken && authToken.includes('%3A%3A')) {
      authToken = authToken.split('%3A%3A')[1];
    }
    else if (authToken && authToken.includes('::')) {
      authToken = authToken.split('::')[1];
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0 || !authToken) {
      return res.status(400).json({
        error: 'Invalid request. Messages should be a non-empty array and authorization is required',
      });
    }

    const checksum = req.headers['x-cursor-checksum'] 
      ?? process.env['x-cursor-checksum'] 
      ?? generateCursorChecksum(authToken.trim());

    const sessionid = uuidv5(authToken, uuidv5.DNS);
    const clientKey = generateHashed64Hex(authToken);
    const cursorClientVersion = "0.45.11";

    // 仅在非API密钥认证时验证令牌有效性
    if (!isApiKeyAuth) {
      const isTokenValid = await validateToken(authToken);
      if (!isTokenValid) {
        return res.status(401).json({
          error: '提供的JWT令牌无效或已过期'
        });
      }
    }

    const cursorBody = generateCursorBody(messages, model);
    const response = await fetch('https://api2.cursor.sh/aiserver.v1.AiService/StreamChat', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${authToken}`,
        'connect-accept-encoding': 'gzip',
        'connect-content-encoding': 'gzip',
        'connect-protocol-version': '1',
        'content-type': 'application/connect+proto',
        'user-agent': 'connect-es/1.6.1',
        'x-amzn-trace-id': `Root=${uuidv4()}`,
        'x-client-key': clientKey,
        'x-cursor-checksum': checksum,
        'x-cursor-client-version': cursorClientVersion,
        'x-cursor-timezone': 'Asia/Shanghai',
        'x-ghost-mode': 'true',
        'x-request-id': uuidv4(),
        'x-session-id': sessionid,
        'Host': 'api2.cursor.sh',
      },
      body: cursorBody,
      timeout: {
        connect: 5000,
        read: 30000
      }
    });

    // 检查响应状态
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Cursor API错误: ${response.status} ${errorText}`);
      return res.status(response.status).json({
        error: `Cursor API错误: ${response.status}`,
        details: errorText
      });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const responseId = `chatcmpl-${uuidv4()}`;

      try {
        for await (const chunk of response.body) {
          let text = chunkToUtf8String(chunk);

          if (text.length > 0) {
            res.write(
              `data: ${JSON.stringify({
                id: responseId,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: req.body.model,
                choices: [
                  {
                    index: 0,
                    delta: {
                      content: text,
                    },
                  },
                ],
              })}\n\n`
            );
          }
        }
      } catch (streamError) {
        console.error('Stream error:', streamError);
        if (streamError.name === 'TimeoutError') {
          res.write(`data: ${JSON.stringify({ error: 'Server response timeout' })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ error: 'Stream processing error' })}\n\n`);
        }
      } finally {
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } else {
      try {
        let text = '';
        for await (const chunk of response.body) {
          text += chunkToUtf8String(chunk);
        }
        // 对解析后的字符串进行进一步处理
        text = text.replace(/^.*<\|END_USER\|>/s, '');
        text = text.replace(/^\n[a-zA-Z]?/, '').trim();
        // console.log(text)

        return res.json({
          id: `chatcmpl-${uuidv4()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: text,
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        });
      } catch (error) {
        console.error('处理响应时出错:', error);
        return res.status(500).json({
          error: '处理响应时出错',
          details: error.message
        });
      }
    }
  } catch (error) {
    console.error('请求处理出错:', error);
    return res.status(500).json({
      error: '请求处理出错',
      details: error.message
    });
  }
});

module.exports = router;
