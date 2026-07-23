# 可执行 Prompt：DeepListener 全站 i18n 迁移

你正在 DeepListener 仓库中实施一次完整的 i18n 迁移。不要只给建议或示例；请按阶段修改代码、更新测试、运行验证，并在所有完成标准满足后交付。

## 一、开始前必须阅读

按顺序完整阅读：

1. `AGENTS.md`
2. `docs/agent-harness/README.md`
3. `docs/plans/2026-07-23-i18n-migration-plan.md`
4. 与被修改模块直接相关的源码和测试

详细方案是本任务的规范。如果本 Prompt 与详细方案不一致，以详细方案为准，但必须在动手前指出冲突。

本任务会修改 `next.config.ts` 和 standalone 行为，按 harness 的 **Adversarial mode** 建立 session、safety profile、sprint contract 和 evaluator report。

先运行 `git status --short`。工作区可能已有用户修改；保留所有无关修改，不要 reset、checkout、覆盖或顺手整理。

## 二、安全边界

不得：

- 修改 `.env*`、凭据或秘密。
- 修改、删除或迁移 `prisma/dev.db`。
- 修改或删除 `public/uploads/`、`public/videos/`。
- 运行 Prisma migration。
- 运行 `npm run sync`。
- 为通过检查而弱化 lint、test、type、build 或 CI 配置。
- 改变数据库中的 status、trackType、trackTopic 或用户数据。

可以运行 `npx prisma generate`；它只生成 Prisma client。

## 三、任务目标

1. 安装并配置 `next-intl`。
2. 删除自研 `PreferencesProvider`，但只能在所有调用点和测试完成迁移后删除。
3. locale 仅支持 `en` 和 `zh-CN`，默认 `en`。
4. URL、App Router 目录和 API URL 保持不变。
5. 服务端优先级：合法 `NEXT_LOCALE` cookie → `Accept-Language` → `en`。
6. 将旧 `localStorage["deeplistener.preferences.locale.v1"]` 一次性迁移到 `NEXT_LOCALE`。
7. 迁移所有用户可见 UI、ARIA、toast、错误回退、日期/时长和导出文本。
8. 保持 domain/data 层使用稳定 ID，翻译只发生在展示或导出边界。
9. 最终 `npm run verify` 和 standalone 双语 smoke test 通过。

## 四、强制架构：without i18n routing

这是没有 locale 路由段的 next-intl 模式。

不要新增：

- `[locale]` 路由目录
- `src/i18n/routing.ts`
- `middleware.ts`
- `proxy.ts`
- `defineRouting`
- `createMiddleware`

### 4.1 `next.config.ts`

保留 `output: "standalone"`，添加：

```ts
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);
```

### 4.2 新增 i18n 基础文件

新增：

```text
messages/en.json
messages/zh-CN.json
src/i18n/config.ts
src/i18n/locale.ts
src/i18n/request.ts
src/i18n/client.ts
src/i18n/domain-message-keys.ts
src/i18n/messages.test.ts
src/i18n/locale.test.ts
src/types/next-intl.d.ts
src/components/i18n/LegacyLocaleMigrator.tsx
src/lib/track-taxonomy.ts
```

`config.ts` 导出：

- `locales = ["en", "zh-CN"] as const`
- `Locale`
- `defaultLocale = "en"`
- `localeCookieName = "NEXT_LOCALE"`
- `localeCookieMaxAge`
- `legacyLocaleStorageKey`
- `isLocale`

`locale.ts` 提供纯函数 `resolveLocale(cookieValue, acceptLanguage)`，正确处理 q-value 和 `zh` / `zh-*` / `en` / `en-*`，并添加单元测试。

`request.ts` 必须直接通过 `cookies()` 和 `headers()` 读取请求，不得使用 `requestLocale`：

```ts
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

在 `src/types/next-intl.d.ts` 中增强 next-intl `AppConfig` 的 `Locale` 和 `Messages`。核心实现不得用 `as any` 绕过 message/locale 类型。

## 五、根 layout 和客户端切换

将 `src/app/layout.tsx` 改为 async Server Component：

- `getLocale()` + `getMessages()`
- `<html lang={locale}>`
- `NextIntlClientProvider`
- 保留 ThemeProvider、TimeTrackingProvider、AppShell、Toaster、PWARegistration

正确嵌套：

```text
NextIntlClientProvider
  ThemeProvider
    TimeTrackingProvider
      AppShell
```

模块级 metadata 可以和 async layout 共存。不要写“metadata 和 async 组件不能共存”之类的错误规避代码。

重写 `LanguageToggle.tsx`：

- `useLocale()`
- `useTranslations("language")`
- typed `Locale`
- 通过 `src/i18n/client.ts` 写 cookie
- `router.refresh()`

### 5.1 旧 localStorage 迁移

不要因为已有 `NEXT_LOCALE` 就提前返回。该 cookie 可能刚由语言协商产生。

规则：

1. 没有旧值：不操作。
2. 旧值非法：删除旧 key，不改 cookie。
3. 旧值合法：本次迁移中旧值优先于 cookie。
4. 先成功删除旧 key，再写 cookie，避免删除失败造成刷新循环。
5. cookie 变化才 `router.refresh()`。
6. cookie 已相同时仍删除旧 key，但不刷新。

将迁移决策抽成纯函数测试，至少覆盖：

- localStorage `zh-CN` + cookie `en`
- 两者相同
- 非法旧值
- 无旧值

## 六、Messages 规范

使用以下顶层 namespace：

```text
common
nav
language
theme
onboarding
landing
library
review
vault
dashboard
setup
practice
feature
statuses
difficulties
trackTypes
topics
errors
exports
metadata
```

边界：

- `practice` 只负责 `src/app/practice/**` 路由层。
- `feature` 负责 `src/components/feature/**`，按 audioPlayer、shadowing、notation 等建立子 namespace。
- 不要让同一文案同时存在于 practice 和 feature。

`messages.test.ts` 验证：

- 两种语言所有叶子 key 完全一致。
- 所有叶子是非空字符串。
- 同一 key 的 ICU 变量名一致。

## 七、禁止把翻译文案当数据

### 7.1 Status

不要把 `TRACK_STATUS_LABELS` 的 value 改成 `"statuses.intensive"`。

- `domain-constants.ts` 只保留 enum、默认值和样式 metadata。
- 在 `src/i18n/domain-message-keys.ts` 建立 `TrackStatus → statuses namespace 相对 key` 映射。
- UI 使用 `useTranslations("statuses")` 解析。
- 更新 `domain-constants.test.ts`。

### 7.2 Chart

`getStatusColor` 只接受 `TrackStatus` enum。

status datum 使用：

```ts
type StatusDatum = {
  status: TrackStatus;
  name: string;
  value: number;
};
```

颜色按 `status`，Legend/Tooltip 按本地化 `name`。禁止按中文、英文或 message key 匹配颜色。

### 7.3 Type / topic

`LibraryManager.tsx` 和 `RenameTrackModal.tsx` 当前的 category/topic option value 会写入数据库。

抽取共享配置：

```ts
{value: "校园生活", messageKey: "campusLife"}
```

- `value` 必须保持现有数据库兼容。
- 展示 `t(messageKey)`。
- filter、PATCH 和数据库比较仍使用 `value`。
- 非预设用户数据原样显示。
- CATEGORIES / track type 使用相同模式。
- 不执行数据 migration。

### 7.4 纯数据模块

- `analytics.ts` 返回稳定 bin key，不返回翻译 label。
- React/chart 边界将 key 翻译为 name。
- duration helper 返回数值结构，不拼接 `h` / `m`。
- `setup-readiness.ts` 返回相对 `setup` namespace 的 key + variables。
- 日期、时间、数字使用 next-intl formatter 或显式应用 locale。

## 八、用户可见 API 错误和导出

- 日志和内部异常保持英文。
- 用户可见 API 响应增加稳定 `errorCode`；必要时保留 `error` 字段兼容已有 contract。
- client 以 `errorCode` 映射 `errors.api.*`，未知 code 使用本地化 fallback。
- 不把未知 server 英文或 provider 原始异常直接作为最终 toast。
- `upload-error.ts` 返回 `{code, status}`，由 client 翻译。
- 本地化 `vault/export/route.ts` 的导出标题、Generated、Total、Filters、Category、Difficulty、Tags、Note 和空结果。
- 导出日期使用当前请求 locale。
- 审计 library/audio export 的用户可见文案和文件名；品牌名和用户数据不翻译。

## 九、迁移范围

依次完成：

### 阶段 A：基础设施与现有消费者

- 安装依赖、更新 lockfile 和 next config。
- 新增 locale/request/messages/type/provider。
- messages 一次加入原 PreferencesProvider 文案和 landing 文案。
- 迁移 layout、AppShell、LanguageToggle、ThemeToggle、Onboarding、LibraryManager 已有 key、landing。
- 更新 AppShell/onboarding/theme 等旧测试。
- `rg 'usePreferences|PreferencesProvider' src` 为零后再删除旧 provider 和旧测试。

### 阶段 B：解除数据耦合

- status message mapping
- chart status enum
- type/topic 稳定 value
- setup readiness key/vars
- analytics 稳定 bin key
- duration/date formatting
- API public errorCode

### 阶段 C：全站模块

按顺序迁移：

1. `src/app/setup/**`
2. `src/app/review/**`
3. `src/app/practice/**`
4. `src/app/vault/**`
5. `src/app/library/**`
6. `src/app/dashboard/**`，包括 `dashboard/symphony/page.tsx`
7. `src/components/feature/**`
8. `src/components/ui/**` 中用户可见的 primitive fallback，至少处理 `dialog.tsx` 的 Close
9. errors、metadata、API public errors、exports

每个模块同时检查：

- 可见文本
- button title、placeholder
- aria-label / aria-description
- toast / confirm
- loading / empty / success / error
- plural / count
- date / time / duration
- 同目录测试

AudioPlayer 本身是 client boundary；它导入的 PlayerControls、SentenceList、WaveformArea 已属于 client dependency graph。直接使用 client hook 或通过 props 传文案都可以，选择最小改动，不要无故重构边界。

### 阶段 D：特殊页面和文档

必须处理或明确记录：

- `src/app/error.tsx`
- `src/app/not-found.tsx`
- `src/app/global-error.tsx`
- `src/app/layout.tsx` metadata
- `public/manifest.json`
- `src/app/api/vault/export/route.ts`
- `CLAUDE.md`
- `docs/architecture.md`
- `openspec/changes/accessibility-preferences/proposal.md`

`global-error.tsx` 在根 provider 外运行。为它实现极小的独立 en/zh-CN fallback，按合法 cookie → `navigator.language` → en 选择，不得依赖可能失败的主 provider。

`public/manifest.json` 保持静态默认英文，并在审计中注明它是 PWA 品牌 metadata、非产品 UI；不要为本次迁移引入动态 manifest 缓存方案。

## 十、验证

先跑定向测试，再跑全量门。不要在三次失败后继续盲修同一问题。

```bash
npm install
npx prisma generate

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

npm run verify
```

按实际改动添加其他受影响测试，尤其是 review、vault、library、feature 和 API contract tests。

执行残留审计并人工分类：

```bash
rg 'usePreferences|PreferencesProvider' src
rg -n '[\p{Han}]' src/app src/components src/lib
rg -n 'toLocaleDateString|toLocaleTimeString|toLocaleString|Intl\.' src/app src/components src/lib
rg -n 'aria-label=|placeholder=|toast\.(success|error)|window\.confirm' src/app src/components
rg -n 'Generated:|Total Notes:|CATEGORY:|Difficulty:|Uncategorized' src/app/api
```

允许保留学习原文、用户数据、注释和日志；不允许用户可见硬编码或翻译 key 泄露。

## 十一、必须完成的 smoke matrix

验证：

1. 无 cookie + English header → SSR 英文，`lang="en"`。
2. 无 cookie + Chinese header → SSR 中文，`lang="zh-CN"`。
3. Chinese cookie + English header → 中文，cookie 优先。
4. old localStorage zh-CN + cookie en → 迁移为中文并删除旧 key。
5. 切换语言不改 URL，刷新/重启后仍保持。
6. `/`、`/setup`、`/library`、`/review`、`/vault`、`/dashboard` 和一个 practice 页面均可切换。
7. topic/type 两种语言提交相同持久化 value。
8. status chart 两种语言颜色相同。
9. error、not-found、global-error 有本地化或独立降级。
10. vault 文本导出与当前 locale 一致。
11. `npm run build` 生成的 `.next/standalone` 在两种 cookie 下都能工作。
12. 条件允许时运行 `npm run desktop:package -- --no-build` 并重复双语 smoke。

## 十二、完成标准

只有以下全部满足才能声明完成：

- `npm run verify` 通过。
- locale resolver、messages、legacy migration 测试通过。
- 无 `usePreferences` / `PreferencesProvider` 残留。
- 两种语言 key 和变量对称。
- 无用户可见硬编码、key 泄露或未分类英文 API 错误。
- status/type/topic/analytics 稳定值未被翻译。
- 数据库、媒体和 `.env*` 未修改。
- 全部 smoke matrix 已执行；无法执行的项要说明具体原因和剩余风险，不能默认为通过。
- standalone 双语可用。
- harness evaluator report 无 blocker 或 must-fix。
- 最终汇报包含：修改摘要、关键架构决策、测试结果、smoke 结果、残留风险、未触碰的受保护数据。
