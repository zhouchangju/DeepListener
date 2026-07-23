# DeepListener 全站 i18n 迁移方案

> 从自研 `PreferencesProvider` 迁移到 `next-intl`，采用 **without i18n routing** 模式：URL 和现有 `src/app/**` 路由树保持不变，服务端按 cookie / `Accept-Language` 解析语言，覆盖所有用户可见的产品界面文案。

- 最后更新：2026-07-23
- 状态：待实施
- 目标版本：Next.js 16.2.5 / React 19.2.3 / TypeScript 5.9.3

---

## 0. 执行契约

### 0.1 成功定义

迁移完成后必须同时满足：

1. `en` 和 `zh-CN` 两种语言均可完整使用全站功能。
2. 首次 SSR、刷新和客户端切换使用同一个 locale，不出现长期 hydration 不一致或 key 泄露。
3. URL 不增加 `/en`、`/zh-CN` 前缀，现有路由与 API URL 不变。
4. 老用户的 `deeplistener.preferences.locale.v1` 偏好只迁移一次到 `NEXT_LOCALE`。
5. Prisma 枚举、数据库中的 `trackType` / `trackTopic`、用户数据和统计分组标识不随显示语言改变。
6. 所有用户可见文案、ARIA 文案、toast、确认框、空状态、错误回退、日期/时长单位和用户下载的导出文本均经过明确的本地化边界。
7. `npm run verify` 通过，并完成生产 standalone 的中英文 smoke test。

### 0.2 仓库安全约束

这是跨模块且触及 `next.config.ts` / standalone 的迁移，实施时必须：

- 完整阅读 `AGENTS.md`、`docs/agent-harness/README.md` 和本文档。
- 按 harness 的 **Adversarial mode** 建立 session、safety profile、sprint contract 和 evaluator report。
- 不修改 `.env*`、凭据、`prisma/dev.db`、`public/uploads/`、`public/videos/`。
- 不运行 Prisma migration；本方案不改变 schema 或持久化数据。
- 不执行 `npm run sync`。
- 保留工作区中与本任务无关的现有修改，不做顺手重构。
- 每个阶段先跑定向测试，再进入下一阶段；最终运行完整质量门。

### 0.3 明确不翻译

- 英语听力原文、字幕、转写结果和 demo seed 学习素材。
- 用户创建的标题、Category、ErrorTag、笔记、topic 名称。
- Prisma 枚举和 API/数据库稳定标识，例如 `UNLEARNT`、`INTENSIVE`。
- 路径、环境变量名、provider 名、文件名、日志和开发者诊断。
- 品牌名 `DeepListener`。
- 静态 PWA manifest 的品牌描述；`public/manifest.json` 保持默认英文并加入审计 allowlist。

用户可见的导出模板、错误解释和操作提示要翻译；机器内部错误和日志不翻译。

---

## 1. 当前事实与关键风险

### 1.1 现有方案

- `src/components/preferences/PreferencesProvider.tsx`
- locale：`"en"`（默认）和 `"zh-CN"`
- 存储：`localStorage["deeplistener.preferences.locale.v1"]`
- API：`usePreferences()` → `{locale, setLocale, t}`
- 约 35 个 flat key，覆盖 nav、language、theme、onboarding 和 library 部分按钮
- SSR 永远英文，`<html lang="en">` 硬编码，首次 client effect 后才读取语言

### 1.2 不能破坏的稳定数据

以下值参与数据库写入、过滤或统计，不能直接替换成翻译：

- `TrackStatus` 枚举值。
- `trackType` / `trackTopic` 字符串。
- Dashboard 的 bin、status、study mode 等聚合标识。
- API error code。

显示文案必须在 React/导出边界由稳定值映射得到。

### 1.3 已知耦合

1. `chart-theme.ts` 当前按中文/英文 label 选颜色。
2. `LibraryManager.tsx` 与 `RenameTrackModal.tsx` 重复定义 `CATEGORIES` / `TOPICS`，且 option value 会写入数据库。
3. `setup-readiness.ts` 在纯 server lib 内直接拼英文。
4. `analytics.ts` 把英文 bin label 当成聚合 key。
5. `formatDuration` 在数据层拼接 `h` / `m`。
6. `requireOkResponse` 可能把 API 的英文 error 原样显示给用户。
7. `global-error.tsx` 运行于根 layout/provider 之外，不能假设 `NextIntlClientProvider` 存在。

---

## 2. 最终架构

### 2.1 选择：without i18n routing

本项目不使用 `defineRouting`、`createMiddleware`、`middleware.ts` 或 `proxy.ts`。

原因：

- 当前 App Router 没有 `[locale]` 路由段。
- 产品要求 URL 不变。
- 只需要两种语言和单个 cookie。
- 直接在 `getRequestConfig` 中读取请求信息是最小、最清晰的方案。

需要的 next-intl 结构：

```text
messages/
  en.json
  zh-CN.json
src/
  i18n/
    config.ts
    locale.ts
    request.ts
    client.ts
    messages.test.ts
    locale.test.ts
  types/
    next-intl.d.ts
```

### 2.2 `next.config.ts`

必须添加 next-intl plugin，同时保留现有 standalone 配置：

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
```

不得删除或弱化现有 Electron / standalone 配置。

### 2.3 Locale 类型和常量

`src/i18n/config.ts`：

```ts
export const locales = ["en", "zh-CN"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookieName = "NEXT_LOCALE";
export const localeCookieMaxAge = 365 * 24 * 60 * 60;
export const legacyLocaleStorageKey = "deeplistener.preferences.locale.v1";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh-CN";
}
```

### 2.4 Locale 解析

`src/i18n/locale.ts` 提供可单测的纯函数：

- `resolveLocale(cookieValue, acceptLanguage): Locale`
- 优先级：合法 `NEXT_LOCALE` → `Accept-Language` → `en`
- `Accept-Language` 至少正确识别：
  - `zh-CN`、`zh`、其他 `zh-*` → `zh-CN`
  - `en`、`en-*` → `en`
  - q-value 顺序
  - 非法/空值 → `en`

不要引入仅用于两种语言协商的额外依赖；实现小型、纯函数解析器并充分测试。

### 2.5 Request config

`src/i18n/request.ts` 直接读取 cookie 和 header，不使用 `requestLocale`：

```ts
import {cookies, headers} from "next/headers";
import {getRequestConfig} from "next-intl/server";
import {localeCookieName} from "./config";
import {resolveLocale} from "./locale";

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale(
    cookieStore.get(localeCookieName)?.value,
    headerStore.get("accept-language"),
  );

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

### 2.6 Provider 和根 layout

`src/app/layout.tsx`：

- 改为 async Server Component。
- 使用 `getLocale()` 和 `getMessages()`。
- `<html lang={locale}>`。
- 在现有 providers 外层添加 `NextIntlClientProvider`。
- 保留 `ThemeProvider`、`TimeTrackingProvider`、`AppShell`、`Toaster`、`PWARegistration`。

目标结构：

```tsx
<html lang={locale}>
  <body>
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider>
        <TimeTrackingProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
          <PWARegistration />
        </TimeTrackingProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  </body>
</html>
```

模块级 `metadata` 可以和 async layout 共存。若本次本地化 metadata，应改为 `generateMetadata()`，不是因为 async layout 强制要求。

接受的权衡：当前客户端交互组件较多，根 provider 暂时传递完整 messages。约 450 条文案对本地应用可接受；不要在本次迁移中额外设计 message 分片系统。

### 2.7 next-intl 类型增强

新增 `src/types/next-intl.d.ts`：

```ts
import messages from "../../messages/en.json";
import {locales} from "@/i18n/config";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof locales)[number];
    Messages: typeof messages;
  }
}
```

核心 locale 和 message 调用中禁止使用 `as any` 绕过类型。

---

## 3. 语言切换与旧偏好迁移

### 3.1 客户端 helper

`src/i18n/client.ts` 集中实现：

- `readLocaleCookie()`
- `writeLocaleCookie(locale)`
- `planLegacyLocaleMigration(storedLocale, cookieLocale)`，保持为可单测纯函数

cookie：

```text
NEXT_LOCALE=<locale>; Path=/; Max-Age=31536000; SameSite=Lax
```

本地 Electron/HTTP 仍需工作，不要无条件添加 `Secure`。

### 3.2 一次性迁移规则

`LegacyLocaleMigrator.tsx` 在 provider 内挂载一次：

1. 读取旧 localStorage。
2. 若旧值为空：结束。
3. 若旧值非法：删除旧 key，不改 cookie。
4. 若旧值合法：**旧偏好在这次迁移中优先于已有 cookie**。
5. 先成功删除旧 key，再写 cookie；删除失败时不刷新，避免循环。
6. cookie 值发生变化时调用 `router.refresh()`。
7. cookie 已与旧值相同时仍删除旧 key，但不刷新。

不要因为已有 `NEXT_LOCALE` 就提前 return；该 cookie 可能来自同一次请求的语言协商。

### 3.3 `LanguageToggle`

- 使用 `useLocale()`、`useTranslations("language")`、`useRouter()`。
- next locale 类型必须是 `Locale`，不能使用宽泛的 `string`。
- 通过 `writeLocaleCookie()` 写 cookie。
- 写入后调用 `router.refresh()`。
- label/title/visible short label 全部翻译。

---

## 4. Messages 设计

### 4.1 顶层 namespace

| Namespace | 归属 |
|---|---|
| `common` | 跨模块通用动作和状态 |
| `nav` | 全局导航 |
| `language` | 语言切换 |
| `theme` | 主题切换 |
| `onboarding` | 新手引导 |
| `landing` | 落地页 |
| `library` | `src/app/library/**` |
| `review` | `src/app/review/**` |
| `vault` | `src/app/vault/**` |
| `dashboard` | `src/app/dashboard/**`，含 symphony 页面 |
| `setup` | setup 页面和 readiness 描述 |
| `practice` | `src/app/practice/**` 路由层文案 |
| `feature` | `src/components/feature/**`；使用 `audioPlayer`、`shadowing`、`notation` 等子 namespace |
| `statuses` | TrackStatus 显示名 |
| `difficulties` | difficulty 显示名 |
| `trackTypes` | 预设 type 的显示名 |
| `topics` | 预设 topic 的显示名 |
| `errors` | error / not-found / API error code 映射 |
| `exports` | 用户下载的文本导出模板 |
| `metadata` | 页面 description 等产品 metadata |

`practice` 和 `feature` 不重复：路由容器文案归 `practice`，可复用 feature 组件自己的文案归 `feature`。

### 4.2 Key 规则

- namespace 内使用语义 key，不使用英文原句作为 key。
- key 不包含 locale。
- ICU 变量名在两种语言中完全一致。
- plural/count 文案使用 ICU，不在组件里手工拼复数。
- 不为了复用单词而牺牲上下文；`common` 只放语义真正一致的通用动作。
- message value 必须是字符串，不能在两种语言中使用不同结构。

### 4.3 对称性测试

`src/i18n/messages.test.ts` 至少验证：

- 两个 JSON 的所有叶子路径完全相同。
- 所有叶子都是非空字符串。
- 相同 key 的 `{variable}` 名集合一致。
- 没有意外的 `undefined` / object leaf。

构建与 smoke test 负责发现 ICU 语法和运行时调用错误。

---

## 5. 稳定 ID 与展示文本的边界

### 5.1 TrackStatus

不要把 `TRACK_STATUS_LABELS.INTENSIVE` 改成 `"statuses.intensive"`。

改为：

- `domain-constants.ts` 只保留 enum、默认值和样式 metadata。
- 新增 UI/i18n 边界映射，例如 `src/i18n/domain-message-keys.ts`：

```ts
export const trackStatusMessageKeys = {
  UNLEARNT: "unlearnt",
  INTENSIVE: "intensive",
  ANALYSIS: "analysis",
  SHADOWING: "shadowing",
  SPEED_SHADOWING: "speedShadowing",
  PARAPHRASE: "paraphrase",
  LEARNT: "learnt",
} as const satisfies Record<TrackStatus, string>;
```

使用 `const t = useTranslations("statuses")` 后调用 `t(trackStatusMessageKeys[status])`。

### 5.2 Chart

颜色函数只接受稳定 enum：

```ts
getStatusColor(status: TrackStatus, palette)
```

status 图表数据同时携带稳定值和展示名：

```ts
type StatusDatum = {
  status: TrackStatus;
  name: string;
  value: number;
};
```

- `<Cell>` 按 `entry.status` 选颜色。
- Legend/Tooltip 按 `entry.name` 展示翻译。
- 不再按中文、英文或 message key 选颜色。

### 5.3 Track type / topic

共享配置必须区分持久化 value 和 message key：

```ts
const presetTopics = [
  {value: "校园生活", messageKey: "campusLife"},
  // ...
] as const;
```

规则：

- `value` 保持与现有数据库兼容。
- option/button 展示 `t(messageKey)`。
- filter、PATCH body、数据库比较继续使用 `value`。
- 未命中预设的用户数据原样展示。
- `CATEGORIES` / track type 使用相同模式。
- 本迁移不做数据库重写或数据 migration。

### 5.4 Analytics 和 duration

`analytics.ts` 不返回翻译后的 label：

- stability/overdue/radar 等数据返回稳定 `key`。
- React 图表边界将 `key` 映射成 `t()` 后的 `name`。
- `formatDuration` 改成返回 `{hours, minutes}` 等结构，或由 UI formatter 接收数值；不要在纯数据层拼 `h` / `m`。
- 日期、时间、数字使用 next-intl `useFormatter()` / `getFormatter()`，或显式传入应用 locale。
- 全量排查 `toLocaleDateString`、`toLocaleTimeString`、`toLocaleString` 和硬编码 `"en-US"`。

### 5.5 Setup readiness

`setup-readiness.ts` 保持纯 server/domain 模块，返回稳定描述：

```ts
{
  id: "ffmpeg",
  status: "ready",
  labelKey: "readiness.ffmpeg.label",
  detailKey: "readiness.ffmpeg.ready",
  detailVars: {}
}
```

key 相对于 `setup` namespace。`setup/page.tsx` 使用 `await getTranslations("setup")` 解析。

测试断言 id/status/key/variables 和安全语义，不再依赖完整英文句子。

### 5.6 API errors 与用户导出

- 日志、异常对象和机器内部错误保持英文。
- API 对 client 暴露稳定 `errorCode`；可暂时保留 `error` 字段兼容现有 contract。
- client 根据 `errorCode` 映射 `errors.api.*`，未知 code 使用本地化 fallback。
- 不把 provider 原始异常或秘密直接显示给用户。
- `requireOkResponse` / 下载 helper 不应把未经分类的 server 英文直接作为最终 UI 文案。
- `upload-error.ts` 返回 `{code, status}`，client 翻译 code。
- `vault/export/route.ts` 的标题、Generated、Total、Filters、Category、Difficulty、Tags、Note、空结果等使用 `exports` namespace。
- 导出 route 从当前请求 locale 生成文件，日期也使用相同 locale。

---

## 6. 文件变更清单

### 6.1 新增

- `messages/en.json`
- `messages/zh-CN.json`
- `src/i18n/config.ts`
- `src/i18n/locale.ts`
- `src/i18n/request.ts`
- `src/i18n/client.ts`
- `src/i18n/domain-message-keys.ts`
- `src/i18n/messages.test.ts`
- `src/i18n/locale.test.ts`
- `src/types/next-intl.d.ts`
- `src/components/i18n/LegacyLocaleMigrator.tsx`
- `src/lib/track-taxonomy.ts`（预设 type/topic 的稳定 value + message key）

### 6.2 删除

仅在所有调用点和测试迁移完成、`rg 'usePreferences' src` 为零后删除：

- `src/components/preferences/PreferencesProvider.tsx`
- `src/components/preferences/preferences.test.ts`
- `src/components/preferences/index.ts`，如果没有其他导出需求

`LanguageToggle.tsx` 可以保留原路径，避免无意义的 import churn。

### 6.3 基础设施与 shell

- `package.json`
- `package-lock.json`
- `next.config.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/preferences/LanguageToggle.tsx`
- `src/components/app-shell/AppShell.tsx`
- `src/components/theme/ThemeToggle.tsx`
- `src/components/onboarding/OnboardingGuide.tsx`
- `src/components/app-shell/AppShell.test.ts`
- `src/components/onboarding/OnboardingGuide.test.ts`
- `src/components/theme/theme.test.ts`
- `src/app/onboarding.test.ts`

### 6.4 业务模块

- `src/app/setup/**`
- `src/lib/setup-readiness.ts`
- `src/lib/setup-readiness.test.ts`
- `src/app/review/**`
- `src/app/practice/**`
- `src/app/vault/**`
- `src/app/library/**`
- `src/app/dashboard/**`
- `src/components/feature/**`
- `src/components/ui/**` 中用户可见的 primitive fallback；至少处理 `dialog.tsx` 的 Close 文案
- `src/lib/domain-constants.ts`
- `src/lib/domain-constants.test.ts`
- `src/lib/upload-error.ts`
- `src/lib/upload-error.test.ts`
- `src/lib/client-response.ts`
- `src/lib/export-client-response.test.ts`
- 与用户可见错误相关的 `src/app/api/**`

修改某个源文件时同步检查同目录测试，不得仅按此列表假设测试完整。

### 6.5 错误、metadata 和特殊页面

- `src/app/error.tsx`
- `src/app/not-found.tsx`
- `src/app/global-error.tsx`
- `src/app/dashboard/symphony/page.tsx`
- `src/app/api/vault/export/route.ts`
- `src/app/api/library/export/route.ts`（审计文件名及可见文案）
- `src/app/api/audio/export/route.ts`（审计文件名及可见文案）
- `src/app/layout.tsx` metadata / `generateMetadata`
- `public/manifest.json`

`global-error.tsx` 不能依赖可能已经失败的根 provider。为它保留一个极小的、独立的 en/zh-CN fallback 字典，在 client 端按合法 cookie → `navigator.language` → en 选择；这是唯一允许不走主 messages provider 的用户可见错误边界。

`public/manifest.json` 保持静态默认英文，并在残留审计中以“PWA 品牌 metadata、非产品 UI”明确 allowlist；不要为了本次迁移引入动态 manifest 缓存问题。

### 6.6 文档

- `CLAUDE.md`：记录 i18n 架构和 commands。
- `docs/architecture.md`：记录 locale resolution 和消息边界。
- `openspec/changes/accessibility-preferences/proposal.md`：更新“无浏览器语言检测”等已经过时的 non-goal 和 rollback 描述。
- `AGENTS.md` 仅在确实需要新的 Codex 工作流规则时修改；不要把架构说明塞入全局规则。

---

## 7. 实施阶段

### 阶段 0：基线和 contract

1. 记录 `git status --short`，确认不覆盖无关修改。
2. 创建 Adversarial harness session。
3. 记录受保护数据状态，但不读取敏感内容、不修改数据。
4. 运行相关基线测试；若基线失败，先记录为既有失败。
5. 建立用户可见文案 inventory，包含 UI、ARIA、toast、error、导出文本和 locale formatting。

### 阶段 A：基础设施和现有 i18n 消费者

1. 安装 `next-intl`，保留 lockfile。
2. 包装 `next.config.ts`。
3. 新增 config / locale / request / type augmentation。
4. 新增 messages，并一次加入：
   - 现有 PreferencesProvider 的全部 key
   - landing 全部文案
5. 改造 root layout 和 provider。
6. 实现 LanguageToggle 和 LegacyLocaleMigrator。
7. 迁移 AppShell、ThemeToggle、Onboarding、LibraryManager 已有 key 和 landing。
8. 更新相关测试。
9. 确认没有调用后删除 PreferencesProvider。

阶段验收：

- locale resolver tests。
- message symmetry tests。
- legacy migration decision tests。
- AppShell/onboarding/theme tests。
- `rg 'usePreferences' src` 无结果。
- `npm run verify:quick`。

### 阶段 B：解除数据/文案耦合

1. TrackStatus label 与 style/domain metadata 解耦。
2. chart color 改为 enum。
3. type/topic 统一为稳定 value + message key。
4. setup readiness 返回 key + vars。
5. analytics bins 返回稳定 key。
6. duration/date formatting 移到展示边界。
7. API public errors 引入稳定 errorCode。

阶段验收：

- `domain-constants.test.ts`
- `analytics.test.ts`
- `setup-readiness.test.ts`
- `upload-error.test.ts`
- topic/type 在中英文下仍提交相同 value 的测试
- chart status color 按全部 enum 的测试

### 阶段 C：按模块迁移硬编码文案

建议顺序：

1. Setup
2. Review
3. Practice 路由层
4. Vault
5. Library 剩余内容
6. Dashboard（含 symphony、charts、日期/时长）
7. Feature components（AudioPlayer、Shadowing、modals、notation 等）
8. Shared UI primitives（至少 dialog Close fallback）
9. Errors、metadata、API public errors 和 exports

每个模块必须同时覆盖：

- 可见文本
- button/title/placeholder
- `aria-label` / `aria-description`
- toast / confirm
- loading / empty / success / failure
- plural、数量、日期、时间、时长
- 同目录结构测试和行为测试

说明：AudioPlayer 已是 client boundary；其直接导入的 `PlayerControls`、`SentenceList`、`WaveformArea` 属于 client dependency graph。可以直接使用 client hooks，或从父组件传入文案；按最小改动选择，不要为了 i18n 重构组件边界。

### 阶段 D：残留审计与文档

1. 更新 architecture / CLAUDE / OpenSpec。
2. 扫描汉字残留并人工分类。
3. 扫描 locale-sensitive API。
4. 审计所有 error/toast/ARIA/export 文案。
5. 完成 evaluator report。

---

## 8. 验证

### 8.1 安装与生成

```bash
npm install
npx prisma generate
```

`prisma generate` 只生成 client；不得运行 migration。

### 8.2 定向测试

```bash
node --import tsx --test \
  src/i18n/locale.test.ts \
  src/i18n/messages.test.ts \
  src/components/app-shell/AppShell.test.ts \
  src/app/onboarding.test.ts

node --import tsx --test \
  src/lib/domain-constants.test.ts \
  src/lib/setup-readiness.test.ts \
  src/lib/upload-error.test.ts \
  src/app/dashboard/analytics.test.ts

node --import tsx --test \
  src/app/library/UploadButton.test.ts \
  src/app/vault/vault-items.test.ts \
  src/app/review/ReviewClient.test.ts
```

按实际改动补充所有受影响测试，不能只运行以上示例。

### 8.3 静态残留审计

```bash
rg 'usePreferences|PreferencesProvider' src
rg -n '[\p{Han}]' src/app src/components src/lib
rg -n 'toLocaleDateString|toLocaleTimeString|toLocaleString|Intl\.' src/app src/components src/lib
rg -n 'aria-label=|placeholder=|toast\.(success|error)|window\.confirm' src/app src/components
rg -n 'Generated:|Total Notes:|CATEGORY:|Difficulty:|Uncategorized' src/app/api
```

这些扫描需要人工分类；零结果不是机械要求。学习素材、用户数据、注释和日志允许保留，用户可见硬编码不允许。

### 8.4 完整质量门

```bash
npm run verify
```

### 8.5 浏览器 smoke matrix

至少验证以下场景：

| 场景 | 预期 |
|---|---|
| 无 cookie，`Accept-Language: en` | SSR `lang="en"`，英文 UI |
| 无 cookie，`Accept-Language: zh-CN` | SSR `lang="zh-CN"`，中文 UI |
| cookie 为 `zh-CN`，header 为 en | cookie 优先，中文 UI |
| localStorage 为 `zh-CN`，cookie 为 en | 一次迁移到 zh-CN，旧 key 删除 |
| 切换语言 | 不改 URL，refresh 后全页语言一致 |
| 刷新/重启 | locale 持久化 |
| topic/type 编辑与过滤 | 两种语言提交相同稳定 value |
| status chart | 两种语言颜色一致、图例翻译 |
| error/not-found/global-error | 有本地化或明确的独立降级 |
| vault 文本导出 | 模板和日期与当前 locale 一致 |

页面至少覆盖 `/`、`/setup`、`/library`、`/review`、`/vault`、`/dashboard`、一个 `/practice/[id]`。

### 8.6 Standalone / Electron smoke

`npm run build` 后验证：

- `.next/standalone` 可以启动。
- en / zh-CN 两种 cookie 请求都能加载 messages。
- `output: "standalone"` 仍生效。
- 如本机条件允许，运行 `npm run desktop:package -- --no-build` 并对 staging server 重复语言 smoke。

不得仅因为开发服务器工作就认定 standalone 完成。

---

## 9. 完成清单

- [ ] 使用 without i18n routing；没有 middleware/proxy 或 `[locale]` 路由
- [ ] `next.config.ts` 包装 `createNextIntlPlugin`
- [ ] cookie / Accept-Language / fallback 顺序有测试
- [ ] 两种 messages key、叶子类型和变量一致
- [ ] next-intl Locale / Messages 类型增强生效
- [ ] old localStorage 偏好只迁移一次且优先级正确
- [ ] `usePreferences` / `PreferencesProvider` 无残留
- [ ] status、type、topic、analytics 不依赖翻译 label
- [ ] 数据库稳定值未改变，无数据 migration
- [ ] 全站用户可见 UI / ARIA / toast / error 已迁移
- [ ] 日期、数字、时长使用应用 locale
- [ ] API public error 使用稳定 code，未知错误有本地化 fallback
- [ ] 用户可见导出模板已本地化
- [ ] global-error 有 provider 外降级策略
- [ ] 相关旧测试已更新，新 locale/messages/migration 测试已添加
- [ ] 静态残留审计完成并记录 allowlist 原因
- [ ] `npm run verify` 通过
- [ ] standalone 中英文 smoke 通过
- [ ] harness evaluator report 无 blocker / must-fix

---

## 10. 回滚

代码回滚不应触碰 Prisma 或用户媒体：

1. 回退 next-intl 相关代码、messages、依赖和 provider。
2. 恢复 `PreferencesProvider` 及其调用点。
3. `NEXT_LOCALE` cookie 可以保留或由用户清除；它不影响数据库。
4. 已删除的旧 localStorage key 不恢复。回滚后语言将回到旧 provider 默认英文，除非另行实现 cookie → localStorage 的兼容读取。

因为旧 localStorage 会被删除，发布前必须确认不会立即回滚到只识别 localStorage 的版本；若需要无损快速回滚，应在过渡期让旧 provider 同时识别 `NEXT_LOCALE`。
