# 前端 CSS / 设计系统现状与 token-first Tailwind 调研

## 1. 当前前端现状

当前 `apps/web` 是 **Next.js 16 App Router + React 18** 的 Web 应用，但产品主体采用客户端 SPA 形态。

入口链路：

```txt
apps/web/app/layout.tsx
  -> import '../src/index.css'

apps/web/app/[[...slug]]/page.tsx
  -> <ClientApp />

apps/web/app/[[...slug]]/client-app.tsx
  -> dynamic import ../../src/App, ssr: false

apps/web/src/App.tsx
  -> 主客户端应用
```

这意味着：

- Next.js 主要负责应用外壳、构建、路由入口和静态/SSR 能力。
- 实际产品 UI 主要由 `apps/web/src/App.tsx` 和 `apps/web/src/components/*` 组成。
- CSS 主要集中在 `apps/web/src/index.css`，当前没有 Tailwind、MUI、Chakra、Radix、shadcn/ui、styled-components、Emotion 等 UI/CSS 框架依赖。
- 组件层使用普通 React 组件 + `className`，样式由全局 CSS class 和 CSS variables 提供。

当前结构的特点：

- 简单直接，依赖少。
- 视觉语言集中，容易全局统一。
- `index.css` 文件很大，组件样式集中在单个全局文件中。
- 多人协作时，CSS 修改容易集中到同一文件，存在较高 Git 冲突概率。
- 全局选择器和组件 class 需要人工维护边界，存在样式串扰风险。

## 2. 设计系统现状

`apps/web/src/index.css` 已经形成了一套比较完整的 CSS variable 设计系统。

### 2.1 背景 / Surface tokens

明主题定义：

```css
--bg: #faf9f7;
--bg-app: #faf9f7;
--bg-panel: #ffffff;
--bg-subtle: #f4f2ed;
--bg-muted: #ece9e2;
--bg-elevated: #ffffff;
```

暗主题也有对应定义：

```css
--bg: #1a1917;
--bg-app: #1a1917;
--bg-panel: #222120;
--bg-subtle: #272523;
--bg-muted: #2e2c29;
--bg-elevated: #2a2825;
```

这是一套明确的 surface scale：页面底色、面板、subtle 区块、muted 区块、浮层。

### 2.2 文字 tokens

```css
--text: #1a1916;
--text-strong: #0d0c0a;
--text-muted: #74716b;
--text-soft: #989590;
--text-faint: #b3b0a8;
```

语义清晰：主文字、强调文字、弱文字、辅助文字、极弱文字。

### 2.3 边框 tokens

```css
--border: #ebe8e1;
--border-strong: #d8d4cb;
--border-soft: #f1eee7;
```

边界层级完整，适合映射为 Tailwind 的 `border-*` token。

### 2.4 品牌主色 / Accent tokens

```css
--accent: #c96442;
--accent-strong: #b45a3b;
--accent-soft: #f5d8cb;
--accent-tint: #fbeee5;
--accent-hover: #b45a3b;
```

整体风格是暖色、纸感、rust / burnt-sienna 调性。暗主题也有对应 accent token。

### 2.5 语义状态色

当前已有状态色体系：

```css
--green;
--green-bg;
--green-border;

--blue;
--blue-bg;
--blue-border;

--purple;
--purple-bg;
--purple-border;

--red;
--red-bg;
--red-border;

--amber;
--amber-bg;
```

这些可覆盖 success、info、purple tone、error、warning 等 UI 状态。

### 2.6 当前遵循度

整体遵循度较高。大部分 UI 使用 `className`，颜色来自 `index.css` 中的 CSS variables。

主要合理例外：

- `AgentIcon.tsx` 中的代理/品牌图标硬编码颜色，例如 Claude、Codex、Gemini 等品牌色。
- `SketchEditor.tsx` 中的画布绘制颜色，属于用户内容/绘图层。
- 部分 SVG 插画中的硬编码颜色，很多其实是现有 token 的具体值。

建议治理的偏离：

- `NewProjectPanel.tsx` 中 SVG preview 使用了 `#d8d4cb`、`#ebe8e1`、`#1a1916`、`#74716b`、`#c96442` 等硬编码值，可替换成 `var(--border-strong)`、`var(--border)`、`var(--text)`、`var(--text-muted)`、`var(--accent)`。
- `SettingsDialog.tsx` 中存在旧 token / fallback，例如 `var(--danger-fg, #f88)`、`var(--warning-fg, #fbbf24)`、`var(--fg-2, #9aa0a6)`、`var(--surface-2, #11141a)`，建议统一到当前 token 命名体系。
- `FileViewer.tsx` 评论 overlay 使用 `rgba(22, 119, 255, ...)`，可考虑抽成 selection/comment overlay token。

## 3. 改造成 token-first Tailwind 的成本

### 3.1 token-first Tailwind 的含义

token-first Tailwind 指：**Tailwind 只作为样式书写和组合工具，视觉源头继续由现有 CSS variables 提供。**

也就是：

- `index.css` 保留 `:root`、`[data-theme='dark']`、系统暗色模式、基础 reset、字体、全局主题变量。
- Tailwind `theme.colors` 覆盖默认 palette，只暴露项目 token。
- 组件中的 utility class 只能调用项目 token，比如 `bg-panel`、`text-muted`、`border-border`、`text-accent`。
- 社区贡献者写 `text-gray-500`、`bg-white`、`border-zinc-200` 这类默认色时，Tailwind 不生成对应样式，配合 guard/lint 在 CI 中拦截。

建议 Tailwind token 映射：

```ts
colors: {
  bg: {
    DEFAULT: 'var(--bg)',
    app: 'var(--bg-app)',
    panel: 'var(--bg-panel)',
    subtle: 'var(--bg-subtle)',
    muted: 'var(--bg-muted)',
    elevated: 'var(--bg-elevated)',
  },
  text: {
    DEFAULT: 'var(--text)',
    strong: 'var(--text-strong)',
    muted: 'var(--text-muted)',
    soft: 'var(--text-soft)',
    faint: 'var(--text-faint)',
  },
  border: {
    DEFAULT: 'var(--border)',
    strong: 'var(--border-strong)',
    soft: 'var(--border-soft)',
  },
  accent: {
    DEFAULT: 'var(--accent)',
    strong: 'var(--accent-strong)',
    soft: 'var(--accent-soft)',
    tint: 'var(--accent-tint)',
    hover: 'var(--accent-hover)',
  },
  green: {
    DEFAULT: 'var(--green)',
    bg: 'var(--green-bg)',
    border: 'var(--green-border)',
  },
  blue: {
    DEFAULT: 'var(--blue)',
    bg: 'var(--blue-bg)',
    border: 'var(--blue-border)',
  },
  purple: {
    DEFAULT: 'var(--purple)',
    bg: 'var(--purple-bg)',
    border: 'var(--purple-border)',
  },
  red: {
    DEFAULT: 'var(--red)',
    bg: 'var(--red-bg)',
    border: 'var(--red-border)',
  },
  amber: {
    DEFAULT: 'var(--amber)',
    bg: 'var(--amber-bg)',
  },
}
```

### 3.2 需要保留在 `index.css` 的内容

建议保留：

- `:root` token 定义。
- `[data-theme='dark']` 暗主题 token。
- `@media (prefers-color-scheme: dark)` 系统模式。
- `html`、`body`、基础 reset。
- 字体变量和全局字体设定。
- 动态 accent color 相关变量。
- 全局 keyframes。
- markdown、code block、artifact iframe、第三方内容渲染等跨组件内容样式。
- 极少数全局 shell 样式，例如 loading shell。

### 3.3 适合迁移到 Tailwind 的内容

适合逐步迁移：

- 组件私有布局：flex、grid、gap、padding、margin。
- 组件私有视觉：背景、边框、圆角、阴影。
- 状态样式：hover、focus、disabled、selected、active。
- 响应式样式。
- button、input、card、dialog、tabs、badge 等可抽象为 UI primitives 的基础组件。

示例：

```css
.settings-card {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 16px;
}
```

可迁移为：

```tsx
<section className="rounded-lg border border-border bg-panel p-4 shadow-sm" />
```

### 3.4 成本评估

#### 低成本部分

- 引入 Tailwind、PostCSS 配置和 content 路径。
- 将现有 CSS variables 映射进 Tailwind theme。
- 覆盖 `theme.colors`，限制默认色。
- 增加 `cn()` 工具，组合 `clsx` + `tailwind-merge`。
- 新增 guard/lint，阻止默认 Tailwind 颜色和 TSX 中随意 `#hex`。

#### 中等成本部分

- 抽象基础 UI primitives：`Button`、`Input`、`Card`、`Dialog`、`Tabs`、`Badge`。
- 迁移高频冲突组件的样式。
- 清理旧 token fallback 和 SVG 硬编码 token 值。
- 建立贡献文档中的 token 对照表。

#### 高成本部分

- 全量迁移 `index.css` 中所有组件样式。
- 大规模改写复杂页面组件。
- 建立完整视觉回归测试。
- 对每个组件做像素级一致性验证。

推荐采用渐进迁移，避免一次性全量重写。

### 3.5 推荐迁移路径

1. 接入 Tailwind，但保留现有 `index.css`。
2. 用 CSS variables 覆盖 Tailwind `theme.colors`，让 Tailwind 只认识项目 token。
3. 新增 `cn()` 工具。
4. 新增 guard/lint，拦截默认 Tailwind palette 和未经允许的 TSX `#hex`。
5. 先治理明显偏离：`SettingsDialog.tsx` 旧 token fallback、`NewProjectPanel.tsx` SVG token 硬编码。
6. 建立 3-5 个 UI primitives。
7. 新代码默认使用 Tailwind + primitives。
8. 旧组件在功能改动时顺手迁移对应局部样式。
9. 每迁移一个组件，删除 `index.css` 中对应旧样式块。

## 4. 对代码冲突的贡献

### 4.1 当前冲突来源

当前 `index.css` 承担了大量组件样式职责。多人贡献时，常见冲突点包括：

- 多个 PR 同时修改 `index.css` 相邻区域。
- 一个组件 TSX 和它的 CSS class 分散在不同位置，重构时需要跨文件同步。
- 删除组件后 CSS 容易残留。
- 全局 class 名称和选择器可能影响其他组件。
- 社区贡献者新增样式时，倾向继续追加到 `index.css`，让单文件越来越大。

### 4.2 Tailwind 对冲突的改善

token-first Tailwind 可以降低以下冲突：

- **Git 冲突减少**：组件样式随组件写在对应 TSX 中，修改不同组件时冲突概率下降。
- **CSS 文件热点降低**：`index.css` 逐步回归 token/base/global 内容，日常 PR 触碰频率下降。
- **样式删除更干净**：删除组件时，相关 utility class 随 JSX 一起删除。
- **选择器串扰减少**：utility class 直接作用在元素上，减少全局 descendant selector 的影响。
- **社区贡献更可控**：Tailwind theme 只暴露项目 token，贡献者即使不熟悉视觉系统，也会被工具引导到正确 token。

### 4.3 Tailwind 对冲突的边界

Tailwind 主要降低 CSS 文件级冲突和选择器串扰。以下问题仍需要治理：

- 同一组件多人同时修改 TSX，仍会冲突。
- 大型组件如果不拆分，className 变化会集中在同一个文件。
- 长 className 可能降低可读性，需要 primitives 和 `cn()` 管理。
- 风格一致性依赖 token 限制、guard/lint、组件封装和 review 规则共同保障。

### 4.4 对社区贡献的实际价值

对社区贡献者而言，token-first Tailwind 的价值在于把设计系统从“隐性约定”变成“工具可执行约束”：

- 写 `bg-panel`、`text-muted`、`border-border` 会自然进入项目视觉体系。
- 写 `bg-white`、`text-gray-500`、`border-zinc-200` 会被 Tailwind theme 限制和 guard 拦截。
- 基础组件提供默认视觉，贡献者少做视觉决策。
- PR review 可以从“主观审美判断”转成“是否使用项目 token / primitives”。

## 5. 总体判断

当前前端已经具备 token-first Tailwind 的良好基础：

- CSS variables 体系完整。
- 明暗主题已经成型。
- 组件整体遵循现有 token。
- 偏离集中在少数可治理位置。
- 迁移可以渐进进行。

建议路线：**先引入 token-first Tailwind 作为新增样式层，不做全量重写；同时把 `index.css` 逐步收缩为 tokens、base、global content styles。**
