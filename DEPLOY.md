# Cursor To OpenAI - Cloudflare Workers 一键部署指南

本指南将帮助你将 Cursor To OpenAI 代理服务部署到 Cloudflare Workers，轻松实现一键部署。

## 方法一：使用Cloudflare控制台（最简单）

1. **登录Cloudflare Dashboard**:
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 如果没有账号，请先注册

2. **创建新的Worker**:
   - 在左侧菜单中选择 **Workers & Pages**
   - 点击 **Create application**
   - 选择 **Create Worker**

3. **部署Worker**:
   - 在编辑器中删除默认代码
   - 复制 `worker.js` 文件的全部内容粘贴到编辑器中
   - 点击 **Save and deploy**

4. **配置KV存储（可选但推荐）**:
   - 在你的Worker详情页面，选择 **Settings** > **Variables**
   - 在 **KV Namespace Bindings** 部分，点击 **Add binding**
   - 名称填写 `TOKEN_STORE`
   - 选择一个已有的KV命名空间或创建新的
   - 点击 **Save**

5. **使用你的Worker**:
   - 现在，你可以通过 `https://<your-worker>.<your-subdomain>.workers.dev` 访问你的应用
   - 管理页面位于 `/admin`
   - API端点位于 `/v1/chat/completions`

## 方法二：使用Wrangler CLI（开发者推荐）

1. **安装Wrangler CLI**:
   ```bash
   npm install -g wrangler
   ```

2. **登录到Cloudflare**:
   ```bash
   wrangler login
   ```

3. **创建KV命名空间**:
   ```bash
   wrangler kv:namespace create TOKEN_STORE
   ```
   将输出中的ID复制到 `wrangler.toml` 文件中

4. **编辑wrangler.toml**:
   取消注释KV部分并填入正确的ID:
   ```toml
   [kv_namespaces]
   binding = "TOKEN_STORE"
   id = "你的KV命名空间ID"
   ```

5. **部署Worker**:
   ```bash
   wrangler publish
   ```

6. **添加令牌**:
   - 访问 `https://<your-worker>.<your-subdomain>.workers.dev/admin`
   - 登录后添加你的Cursor令牌

## API使用

1. **直接使用OpenAI SDK**:
   ```javascript
   import OpenAI from 'openai';

   const openai = new OpenAI({
     baseURL: 'https://<your-worker>.<your-subdomain>.workers.dev/v1',
     apiKey: '你的密码或Cursor令牌'
   });

   async function main() {
     const completion = await openai.chat.completions.create({
       model: "claude-3-sonnet-20240229",
       messages: [
         { role: "user", content: "你好！" }
       ]
     });
     console.log(completion.choices[0].message.content);
   }

   main();
   ```

2. **curl命令行测试**:
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer 你的密码或Cursor令牌" \
     -d '{"model":"claude-3-sonnet-20240229","messages":[{"role":"user","content":"你好！"}]}' \
     https://<your-worker>.<your-subdomain>.workers.dev/v1/chat/completions
   ```

## 注意事项

1. **令牌管理**:
   - 由于Worker的无状态特性，你需要使用KV或Durable Objects来持久化存储令牌
   - 默认密码是 `123`，可以在wrangler.toml的vars部分修改

2. **使用限制**:
   - 免费计划的Workers每天有100,000次请求限制
   - 单个请求执行时间限制为10ms (CPU时间)
   - 详情请参考[Cloudflare Workers限制](https://developers.cloudflare.com/workers/platform/limits/)

3. **存储令牌**:
   - 如果没有配置KV，令牌将在Worker重启后丢失
   - 可以通过修改worker.js中的tokenStore初始值来预设令牌

## 故障排除

- **令牌验证失败**: 确保你的Cursor令牌仍然有效
- **接口超时**: 检查是否超过了Workers的CPU时间限制
- **存储问题**: 确保正确配置了KV命名空间绑定 