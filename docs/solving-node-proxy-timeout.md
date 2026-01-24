# 彻底解决 Node.js 18+ 环境下 OpenAI API 代理超时之谜

## 1. 现象描述：诡异的 30 秒
在开发 `DeepListener` 时，我们遇到了一个极其困扰的问题：
- **命令行工具 (curl)**：请求 OpenAI API 瞬间返回结果，网络通畅。
- **程序代码 (Node.js)**：同样的 API Key，同样的网络环境，却始终报 `Request timed out`，且精准地在 30 秒时触发。

## 2. 深度剖析：为什么 curl 行，Node.js 不行？

### 2.1 环境变量的继承差异
- **curl**：作为原生二进制工具，它深度集成在 Shell 环境中，会自动读取并识别系统环境变量 `https_proxy` 或 `http_proxy`。
- **Node.js**：处于安全和设计考虑，Node.js 运行时**默认不会自动读取**系统代理变量来配置其内置的网络请求库。

### 2.2 核心矛盾：Native Fetch vs http.Agent
这是最关键的底层原因。
- **旧时代（Node < 18）**：开发者通常使用 `axios` 或 `node-fetch`。这些库基于 Node.js 的 `http/https` 模块。我们可以通过 `https-proxy-agent` 库创建一个 `httpAgent` 并传给它们。
- **新时代（Node >= 18）**：Node.js 引入了基于 **Undici** 实现的原生 `fetch` 接口。
  - **坑点**：`OpenAI` SDK v4 在检测到环境支持原生 `fetch` 时，会优先使用它。
  - **真相**：原生 `fetch` **完全忽略** `httpAgent` 配置。因为 `httpAgent` 是为旧的 `http` 模块设计的，而 `fetch` 的底层是全新的 `undici` 引擎。

所以，即使我们在代码里写了 `new OpenAI({ httpAgent: ... })`，在 Node 20 环境下，这个配置也会被悄悄丢弃，导致请求依然在“直连”墙外的服务器，最终被拦截导致 30s 超时。

## 3. 进化后的解决方案

### 3.1 方案 A：使用 Undici 代理（推荐）
在 Node 18+ 中，我们需要使用 `undici` 提供的 `ProxyAgent` 并将其设置为**全局调度器 (Global Dispatcher)**。

```typescript
import { ProxyAgent, setGlobalDispatcher } from "undici";

const proxyUrl = process.env.HTTPS_PROXY;
if (proxyUrl) {
  const dispatcher = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(dispatcher); // 这会接管整个 Node 进程中所有原生 fetch 的流量
}
```

### 3.2 方案 B：TUN 模式（网络层拦截）
如果你的代理软件（如 Clash Verge, ClashX Pro）支持 **TUN 模式**，它会虚拟出一张网卡。此时 Node.js 的所有流量在进入物理网卡前就会被拦截，代码层不需要做任何修改。这是最省心的办法，但需要软件支持。

## 4. 总结与最佳实践

| 环境 | 代理识别 | 解决方案 |
| :--- | :--- | :--- |
| **Terminal (curl)** | 自动识别 | 无需配置 |
| **Node.js < 18** | 手动配置 | `https-proxy-agent` + `httpAgent` |
| **Node.js >= 18** | 手动配置 | `undici` + `setGlobalDispatcher` |
| **Next.js API Route** | 手动配置 | 同 Node.js >= 18 |

### 给开发者的 Checklist：
1. **Node 版本**：如果是 18 或 20，优先考虑 `fetch` 兼容性。
2. **代理协议**：确保 `HTTPS_PROXY` 的 URL 格式正确（例如 `http://127.0.0.1:7890`）。
3. **连通性测试**：先用 `curl -x http://127.0.0.1:7890 https://api.openai.com` 验证代理本身是否有效。
4. **代码注入**：在 `OpenAI` 实例化之前，必须先调用 `setGlobalDispatcher`。

---
*本文由 DeepListener 开发团队在解决 2026 年初的一次重大网络调试中总结。*
