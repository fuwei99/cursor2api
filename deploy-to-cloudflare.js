#!/usr/bin/env node

/**
 * Cursor To OpenAI - Cloudflare Workers 一键部署脚本
 * 
 * 使用方法:
 * 1. 确保已安装Node.js
 * 2. 运行: node deploy-to-cloudflare.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 彩色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// 打印彩色日志
function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// 执行命令并处理错误
function execCommand(command) {
  try {
    log(`执行命令: ${command}`, 'cyan');
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    log(`命令执行失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 检查是否安装了wrangler
function checkWrangler() {
  try {
    execSync('wrangler --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// 主函数
async function main() {
  log('\n===== Cursor To OpenAI - Cloudflare Workers 一键部署 =====\n', 'bright');
  
  // 检查是否安装了wrangler
  if (!checkWrangler()) {
    log('未检测到wrangler，正在安装...', 'yellow');
    execCommand('npm install -g wrangler');
  }
  
  // 登录到Cloudflare
  log('\n正在登录到Cloudflare...', 'green');
  execCommand('wrangler login');
  
  // 创建KV命名空间
  log('\n创建KV命名空间用于存储令牌...', 'green');
  
  let kvNamespaceId;
  try {
    const output = execSync('wrangler kv:namespace create TOKEN_STORE', { encoding: 'utf8' });
    const match = output.match(/id = "([^"]+)"/);
    if (match && match[1]) {
      kvNamespaceId = match[1];
      log(`KV命名空间创建成功，ID: ${kvNamespaceId}`, 'green');
    } else {
      throw new Error('无法解析KV命名空间ID');
    }
  } catch (error) {
    log(`创建KV命名空间失败: ${error.message}`, 'red');
    log('将继续部署，但令牌存储将不会持久化', 'yellow');
  }
  
  // 更新wrangler.toml文件
  if (kvNamespaceId) {
    log('\n更新wrangler.toml配置...', 'green');
    let wranglerConfig = fs.readFileSync('wrangler.toml', 'utf8');
    wranglerConfig = wranglerConfig.replace(/# \[kv_namespaces\]/, '[kv_namespaces]');
    wranglerConfig = wranglerConfig.replace(/# binding = "TOKEN_STORE"/, 'binding = "TOKEN_STORE"');
    wranglerConfig = wranglerConfig.replace(/# id = "替换为你创建的命名空间ID"/, `id = "${kvNamespaceId}"`);
    fs.writeFileSync('wrangler.toml', wranglerConfig);
  }
  
  // 询问是否要更改默认密码
  const question = (text) => new Promise((resolve) => rl.question(text, resolve));
  const changePassword = await question('\n是否要更改默认API密码？(默认: 123) [y/N]: ');
  
  if (changePassword.toLowerCase() === 'y') {
    const newPassword = await question('请输入新密码: ');
    if (newPassword.trim()) {
      let wranglerConfig = fs.readFileSync('wrangler.toml', 'utf8');
      wranglerConfig = wranglerConfig.replace(/DEFAULT_PASSWORD = "123"/, `DEFAULT_PASSWORD = "${newPassword.trim()}"`);
      fs.writeFileSync('wrangler.toml', wranglerConfig);
      log(`密码已更新为: ${newPassword.trim()}`, 'green');
    }
  }
  
  // 部署Worker
  log('\n开始部署Worker...', 'green');
  execCommand('wrangler publish');
  
  log('\n===== 部署完成! =====', 'bright');
  log('\n您现在可以访问您的Worker URL来使用应用。', 'green');
  log('管理页面位于 /admin', 'green');
  log('API端点位于 /v1/chat/completions', 'green');
  log('\n记得添加您的Cursor令牌才能使用API功能!', 'yellow');
  
  rl.close();
}

main().catch(error => {
  log(`部署过程中出错: ${error.message}`, 'red');
  process.exit(1);
}); 