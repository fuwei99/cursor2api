# Cursor To OpenAI

将 Cursor 编辑器转换为 OpenAI 兼容的 API 接口服务。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/你的用户名/cursor-to-openai-worker)

## 项目简介

本项目提供了一个代理服务，可以将 Cursor 编辑器的 AI 能力转换为与 OpenAI API 兼容的接口，让您能够在其他应用中复用 Cursor 的 AI 能力。
- 支持同时传入多个Cookie，使用多个英文逗号分隔

## 使用前准备

1. 访问 [www.cursor.com](https://www.cursor.com) 并完成注册登录（赠送 150 次快速响应，可通过删除账号再注册重置）
2. 在浏览器中打开开发者工具（F12）
3. 找到 应用-Cookies 中名为 `WorkosCursorSessionToken` 的值并保存(相当于 openai 的密钥)

## 接口说明

### 基础配置

- 接口地址：`http://localhost:3010/v1/chat/completions`
- 请求方法：POST
- 认证方式：Bearer Token（使用 WorkosCursorSessionToken 的值，支持英文逗号分隔的 key 入参）

### 请求格式和响应格式参考 openai

## 部署方式

### 方式一：Cloudflare Workers（一键部署 - 推荐）

点击上方的 **Deploy to Cloudflare Workers** 按钮，即可一键部署到你的Cloudflare账户：

1. **点击部署按钮**后，会自动跳转到Cloudflare部署页面
2. **登录**你的Cloudflare账户
3. **确认**部署设置（可使用默认设置）
4. **点击部署**
5. 部署完成后，访问 `https://<your-worker>.<your-subdomain>.workers.dev/admin` 进行配置

详细部署步骤请参考 [DEPLOY.md](DEPLOY.md)

### 方式二：Cloudflare Workers（手动部署）

我们提供了Cloudflare Workers版本，可以手动部署：

1. **手动部署**:
   - 登录[Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 创建一个新的Worker
   - 复制 `worker.js` 的内容到Worker编辑器
   - 点击"部署"

### 方式三：Docker 部署

```bash
docker run -d --name cursor-to-openai -p 3010:3010 ghcr.io/jiuz-chn/cursor-to-openai:latest
```

### 方式四：本地开发

```bash
cd Cursor-To-OpenAI
npm install
npm run start
```

## 配置您的API

部署完成后：

1. 访问管理界面：`https://<your-worker>.<your-subdomain>.workers.dev/admin`
2. 在Cloudflare控制台 > Workers & Pages > 你的Worker > Settings > Variables > KV Namespace Bindings:
   - 添加一个名为`TOKEN_STORE`的命名空间
   - 使用Workers KV管理存储令牌

## 注意事项

- 请妥善保管您的 WorkosCursorSessionToken，不要泄露给他人
- 本项目仅供学习研究使用，请遵守 Cursor 的使用条款

## 致谢

- 本项目基于 [cursor-api](https://github.com/zhx47/cursor-api)(by zhx47) 进行优化。
- 本项目整合 [cursor-api](https://github.com/lvguanjun/cursor-api)(by lvguanjun) 中的改进。
