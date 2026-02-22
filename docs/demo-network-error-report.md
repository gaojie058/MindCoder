# MindCoder Demo — "Run MindCoder" Network Error 测试报告

**日期:** 2026-02-21  
**报告人:** 阿龙 (AI Assistant)  
**测试环境:** demo.mindcoder.ai (前端) + mind-coder-backend.vercel.app (后端)  
**分支:** main

---

## 问题描述

用户在 `demo.mindcoder.ai` 上传 Sample Data 文件后，点击 "Run MindCoder" 按钮，页面跳转到 Open Codes 步骤后无反应。添加 debug alert 后确认报错为：

> **[MindCoder Debug] Regenerate "card" failed: Network Error**

## 根因分析

### 确认的根本原因：**Vercel Hobby Plan 10 秒 Serverless Function 超时**

| 测试场景 | 实际耗时 | Vercel Hobby 超时 | 结果 |
|---|---|---|---|
| Interview_1.txt (6KB) 简化 prompt | 9.7s | 10s | ⚠️ 边界 |
| Interview_1.txt (6KB) 完整 prompt + few-shot | **17.0s** | 10s | ❌ 超时 |
| Interview_1.txt (6KB) 完整模拟 | **19.0s** | 10s | ❌ 超时 |

### 排查过程

1. **后端存活检查** ✅ — `GET /` 返回 "MindCoder API — running on Vercel"
2. **API 功能检查** ✅ — `POST /api/chat` 简单请求正常返回
3. **CORS 检查** ✅ — `Access-Control-Allow-Origin: *` 正确设置
4. **文件大小检查** ✅ — Sample Data 文件仅 6-17KB，远低于 4.5MB body limit
5. **API Key 检查** ✅ — OpenAI API key 有效，GPT-5 正常响应
6. **前端逻辑检查** ✅ — `autoRun` → `regenerateStep("card")` → `executeStep` 链路正确
7. **耗时测试** ❌ — 完整 prompt + 文件 = **17-19 秒**，超过 Vercel 10 秒限制

### 为什么本地测试成功但线上失败

- 本地开发服务器（`node` / `ts-node`）没有 function 执行时间限制
- Vercel Hobby Plan 强制 10 秒超时，`vercel.json` 中的 `maxDuration: 299` 在免费 plan 下被忽略
- GPT-5 处理完整 open coding prompt（模板 + few-shot example + 文件内容）需要 17-19 秒

## 已实施的修复

### SSE Streaming 方案（已 push，待后端重新部署）

**后端改动：**
- `backend/api/routes/chat.ts` — 新增 `POST /api/chat/stream` 端点
- `backend/api/utils/openaiHandler.ts` — 新增 `handleOpenAIRequestStream()` 函数，支持 OpenAI + Anthropic streaming
- `backend/vercel.json` — 添加 `"supportsResponseStreaming": true`

**前端改动：**
- `frontend/src/api/api.ts` — 新增 `fetchStream()` 函数，使用 `fetch` + `ReadableStream` 消费 SSE
- `frontend/src/stores/useGenerationStore.ts` — `executeStep()` 改为通过 `postWithStream()` 调用，失败自动 fallback 到 axios

**原理：** Vercel 对 streaming response 的超时是按"首字节到达时间"计算的（而非总执行时间）。只要 LLM 在 10 秒内开始输出第一个 token，连接就不会被断开。

### 当前状态

| 组件 | 状态 | 说明 |
|---|---|---|
| 前端代码 | ✅ 已部署 | Vercel 从 main 分支自动部署 |
| 后端代码 | ❌ 待部署 | 需要手动 `vercel --prod` 或确认 GitHub 自动部署 |
| Streaming 端点 | ❌ 未生效 | `/api/chat/stream` 返回 404 |

## 待办

1. **[紧急] 重新部署后端** — 在电脑上运行 `cd backend && npx vercel --prod`，或确认后端 Vercel project 的 GitHub 自动部署设置
2. **[验证] 部署后测试** — 确认 `POST /api/chat/stream` 返回 SSE 而非 404
3. **[可选] 升级 Vercel Plan** — Pro plan ($20/月) 有 60 秒超时，可作为备选方案
4. **[可选] 前端 loading 状态优化** — 当前 Network Error 无 UI 反馈，用户看不到报错

## 相关文件

```
backend/api/routes/chat.ts          — streaming 端点
backend/api/utils/openaiHandler.ts  — streaming handler
backend/vercel.json                 — supportsResponseStreaming
frontend/src/api/api.ts             — fetchStream client
frontend/src/stores/useGenerationStore.ts — postWithStream wrapper
```

## Commit History

- `958fc00` — feat: add SSE streaming to bypass Vercel 10s timeout
- `333f325` — merge: human+ai → main (debug alerts, later cleaned up)
