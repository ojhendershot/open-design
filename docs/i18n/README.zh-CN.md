<h1 align="center">Open Design</h1>

<p align="center">
  <img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/assets/hero.png" alt="Open Design — Open source · Local · Claude Design, but open" width="100%" />
</p>


<p align="center">
  <a href="https://open-design.ai/"><img alt="Download" src="https://img.shields.io/badge/download-open--design.ai-ff6b35?style=flat-square" /></a>
  <a href="https://github.com/nexu-io/open-design/releases"><img alt="Release" src="https://img.shields.io/github/v/release/nexu-io/open-design?style=flat-square&color=blueviolet&label=release&include_prereleases&display_name=tag" /></a>
  <a href="../../LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square" /></a>
  <a href="https://discord.gg/qhbcCH8Am4"><img alt="Discord" src="https://img.shields.io/badge/discord-join-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
  <a href="https://x.com/nexudotio"><img alt="Follow @nexudotio on X" src="https://img.shields.io/badge/follow-%40nexudotio-1DA1F2?style=flat-square&logo=x&logoColor=white" /></a>
  <a href="../../QUICKSTART.md"><img alt="Quickstart" src="https://img.shields.io/badge/quickstart-3%20commands-green?style=flat-square" /></a>
</p>

<p align="center">
  <a href="../../README.md">English</a> · <b>简体中文</b> ·
  <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja-JP.md">日本語</a> ·
  <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a> ·
  <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> ·
  <a href="README.pt-BR.md">Português</a> · <a href="README.ru.md">Русский</a> ·
  <a href="README.ar.md">العربية</a> · <a href="README.tr.md">Türkçe</a> ·
  <a href="README.uk.md">Українська</a>
</p>

<br/>

> **[Claude Design][cd] 的开源替代。** 本地优先，支持 OpenClaw、Claude Code、Hermes Agent 等 **16 个 Coding Agent** 直接运行。
>
> **129 个品牌设计体系**——Linear / Stripe / Apple / Notion 等任意切换。
>
> **31 个 Skill**——原型 / Live Artifact / Slides / 图片 / 视频 / 音频全覆盖。

---

## 📋 What

✨ **Open Design（OD）是 [Claude Design][cd] 的开源替代——一个用自然语言生成成品设计稿的开源工作台。**

📝 用一句话描述你的设计需求，即可产出可直接交付的原型、Live Artifact、Slides、图片、视频、音频——🎨 出品对标资深设计师水准，而非千篇一律的 AI 风格。

📤 支持 HTML、PDF、PPT、ZIP、Markdown 等多种格式导出。

🤖 由 **Coding Agent 驱动**（Claude Code / Codex / Cursor Agent / OpenClaw 等任选），📂 所有 Skill 和 Design System 都是项目里的 Markdown 文件——你可以随时编辑、复制、分享。

💻 **本地优先**，所有数据与运行环境完全在你自己的设备上。

## ✨ Key Features

- 🤖 **16 个 Coding Agent** ── Claude Code · Codex · Cursor Agent · Gemini CLI · OpenClaw · Hermes Agent · Kimi · Qoder · Copilot CLI 等，自动检测 `PATH` 上已装好的 CLI
- 🎨 **129 个品牌设计体系** ── Linear / Stripe / Apple / Notion / Vercel / Anthropic / Tesla 等，一键切换品牌语言
- 🛠️ **31 个可组合 Skill** ── 原型、Live Artifact、Slides、杂志海报、仪表盘、社交三连图、E-guide、动效页、周报、OKR、看板等
- 🎬 **多模态输出** ── HTML 原型、网页 Slides、gpt-image-2 静帧、Seedance 2.0 电影感视频、HyperFrames HTML→MP4 动效
- 🔌 **每一层都 BYOK** ── Anthropic / OpenAI / Azure / Google + 14 家媒体供应商（Volcengine / MiniMax / FishAudio / Replicate / ElevenLabs / Suno …）
- 💾 **本地优先存储** ── 项目落本地 SQLite（`.od/` 目录），凭证不出你的机器
- 🖼️ **沙盒预览** ── 每个 artifact 在干净的 `srcdoc` iframe 中渲染，支持 HTML / PDF / PPT / ZIP / Markdown 多格式导出
- 🎭 **Sketch 草图 + Live Artifact** ── 在画布上画结构代替 prompt 描述；接 Notion / Linear / Slack 实时数据（Composio）
- 🚀 **一条命令的生命周期** ── `pnpm tools-dev` 一键启动 daemon + web（+ desktop），端口、命名空间、日志统一管理
- 📜 **Apache-2.0 开源** ── fork、自部署、商用全部允许

## 💡 Why

🚀 2026 年 4 月，Anthropic 发布了 [Claude Design][cd]，**第一次让 LLM 真正做设计**——不是写一篇关于设计的文章，而是**直接产出一份能用的设计稿**。

🔒 但它**闭源、付费、只跑在云端**，模型也只能用 Anthropic 自家的。**换 Agent、自部署、BYOK，全都做不到**。

🔓 Open Design 想让同样的能力变得开放：**模型自由选择、密钥自主管理、Skill 与设计体系皆为可编辑的本地文件**，整套系统在你自己的设备上运行。

🤝 我们不打算重新造一个 Agent——你电脑上的 Claude Code、Codex、Cursor Agent 已经足够强大。**OD 做的，是把它们接进一个完整的设计工作流。**

## 🆚 Difference from other solutions

| | Claude Design | Figma | Lovable / v0 / Bolt | **Open Design** |
|---|---|---|---|---|
| **开源** | ❌ | ❌ | ❌ | ✅ Apache-2.0 |
| **本地运行** | ❌ 仅云端 | ❌ 数据强依赖云端 | ❌ 仅云端 | ✅ daemon + 桌面版 |
| **Agent** | 锁 Anthropic | Make 模式锁自家 | 锁自家模型 | ✅ 16 个 CLI 任选 |
| **BYOK** | ❌ | ❌ | 部分 | ✅ Anthropic / OpenAI / Azure / Google |
| **品牌设计体系** | 内置但不可换 | 团队 Library（私域） | 主题 JSON | ✅ 129 个 Markdown 体系，可自定义 |
| **Skill 扩展** | 闭源 | Plugin 市场（受平台审核） | 闭源 | ✅ 拖入文件夹即生效 |
| **场景** | 通用设计 | UI / 原型 / 协作 | 偏代码原型 | ✅ 设计 / 营销 / 运营 / 产品 / 财务 / HR |

## 🖼️ Demo

按四类核心产物展示：

### 📐 原型（Prototype）

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/gamified-app.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><code>gamified-app</code></a> · 游戏化移动端原型——三屏暗色舞台 + XP 进度条 + 任务卡</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/social-carousel.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><code>social-carousel</code></a> · 社交媒体三连图——1080×1080，标题串联，循环呼应</sub></td>
</tr>
</table>

### 🎞️ Slide

<table>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/kami-deck.png" width="380"/><br/><sub><b>Kami Deck</b>——「Designing intelligence on warm paper」杂志风开场页</sub></td>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/open-design-landing-deck.png" width="380"/><br/><sub><b>Open Design Landing Deck</b>——产品落地页风格的演示稿</sub></td>
</tr>
</table>

### 🖼️ 图片

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/3d-stone-staircase-evolution-infographic.json"><img src="https://cms-assets.youmind.com/media/1776661968404_8a5flm_HGQc_KOaMAA2vt0.jpg" width="380"/></a><br/><sub><b>3D Stone Staircase Evolution Infographic</b>——三段式信息图，石刻质感</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/profile-avatar-glamorous-woman-in-black-portrait.json"><img src="https://cms-assets.youmind.com/media/1777453184257_vb9hvl_HG9tAkOa4AAuRrn.jpg" width="380"/></a><br/><sub><b>Glamorous Woman in Black Portrait</b>——编辑级影棚人像</sub></td>
</tr>
</table>

### 🎬 视频

<table>
<tr>
<td width="50%"><a href="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/downloads/default.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Luxury Supercar Cinematic</b>——叙事产品片，点击播放 MP4</sub></td>
<td width="50%"><a href="https://github.com/YouMind-OpenLab/awesome-seedance-2-prompts/releases/download/videos/1402.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7f63ad253175a9ad1dac53de490efac8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Japanese Romance Short Film</b>——15s Seedance 2.0 叙事片</sub></td>
</tr>
</table>

## 🎯 Use cases

### 🎨 设计师

**现有流程**：在 Figma 里一帧帧画原型，反复对齐品牌规范，再切图给前端；改版时多套设计稿手动同步。

**痛点**：起稿耗时长、品牌切换靠肉手改组件、和工程的交付没有「同一份真实来源」。

**OpenDesign**：用 Sketch 草图代替 prompt 描述结构，Agent 直接生成代码原型；切换 Design System 自动应用新品牌的色板/字体/间距；双轨评论让自留 note 和给 Agent 的修改指令分离，最终一份 HTML 既是设计稿也是工程产物。

---

### 📋 产品经理

**现有流程**：Notion 写 PRD → Figma 拼线框图 → Keynote 做汇报 deck → 三套文档手动对齐。

**痛点**：三个工具来回切、版本永远不一致、想给老板看一个「会动的 demo」要排期等开发。

**OpenDesign**：自然语言直接产出 PM Spec 文档（带 TOC + 决策日志）；杂志风 Slides 一句话出种子轮 pitch deck；Live Artifact 接 Notion / Linear 真实数据，五分钟做出可演示的产品原型，不用排期等开发。

---

### 💻 开发者

**现有流程**：用 v0 / Bolt 起原型，但模型和 Key 都被锁在云端；想把 Skill 沉淀成团队资产，发现没法 fork。

**痛点**：数据出域、token 成本不可控、扩展能力受平台审核、设计到代码的交接靠人工翻译。

**OpenDesign**：BYOK 接自有 LLM 网关，所有项目数据落本地 SQLite；Skill 是 `SKILL.md` + `assets/` 文件夹，丢进 `skills/` 即生效；Handoff to Coding Agent 把设计稿原样交给 Cursor / Claude Code 接手开发，上下文不丢。

---

### 📣 运营 & 市场

**现有流程**：每出一波活动都要找设计排期出图，节奏慢；多平台尺寸（小红书 / 公众号 / 抖音）靠手工裁切适配。

**痛点**：等设计排期、改字改色都要重做、社媒一周出五十张图人力扛不住。

**OpenDesign**：一次 prompt 出 6 张并排社交卡片变体（小红书封面 / 公众号头图 / 抖音竖版）任选；周报 / OKR / 看板用 Live Artifact 直接接 Notion / Linear / Slack 数据源，发布一次后续自动刷新，不用每周重做。

## 🚀 Getting started

按你的使用场景，三种方式任选其一：

### 1️⃣ 下载客户端（最快，零配置）

最简单的上手方式——下完即用，自动检测 PATH 上的 Coding Agent，本地 SQLite 持久化项目。

- 桌面版（macOS Apple Silicon · Windows x64）：[open-design.ai](https://open-design.ai/)
- 历史版本：[GitHub Releases](https://github.com/nexu-io/open-design/releases)

适合：个人用户、设计师、PM——只想点开就开始干活。

### 2️⃣ 一键部署到云端（团队共享）

把 Web 层部署到 Vercel，整套团队共用，BYOK 凭证可走环境变量；daemon 部分仍可本地或自建服务器跑，分离前后端。

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/nexu-io/open-design"><img alt="Deploy to Vercel" src="https://img.shields.io/badge/Deploy_to-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  <a href="https://railway.app/new/template?template=https://github.com/nexu-io/open-design"><img alt="Deploy to Railway" src="https://img.shields.io/badge/Deploy_to-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" /></a>
  <a href="../deploy.md"><img alt="Self-host with Docker" src="https://img.shields.io/badge/Self--host-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" /></a>
</p>

完整部署指南：[`docs/deploy.md`](../deploy.md)

适合：小团队、初创公司——希望团队共用一份资产库 + 设计体系，但不想运维基础设施。

### 3️⃣ 自己动手部署（完全自主）

Clone 源码本地跑，daemon + Web + 可选 Electron 桌面壳子全栈在你机器上：

```bash
git clone https://github.com/nexu-io/open-design
cd open-design
pnpm install
pnpm tools-dev start
# → http://localhost:3000
```

完整 Quickstart：[`QUICKSTART.md`](../../QUICKSTART.md) · 架构与可选项：[`docs/architecture.md`](../architecture.md)

适合：开发者、企业自部署——需要 fork 代码、加自定义 Skill、对接内部 LLM 网关。

---

**深入文档**

| | |
|---|---|
| 📐 [Architecture](../architecture.md) | daemon · 协议解析 · BYOK 代理 |
| 🧠 [Philosophy](../philosophy.md) | Junior-Designer 模式 · 5 维自评 · 反 AI-slop |
| 🤖 [Agents](../agents.md) | 16 CLI 详解 |
| 🎨 [Design Systems](../design-systems.md) | 129 个内置体系 |
| 🛠️ [Skills](../../skills/) | 31 个 Skill 目录 |

## 🗺️ Roadmap

### ✅ 已上线

- **🏠 Home** — 资产库（My Design / Templates / Brand Systems）
- **🎨 Studio** — Prototype / Slides / Media / Import 4 种起步、Chat + File Manage + Sketch 草图 + 沙盒 Preview、Editor 的 Tweaks · Comment · Present、HTML/PDF/PPT/ZIP/MD 多格式导出
- **⚙️ Setting** — Execute Mode（Harness / BYOK）、14 家 Media Provider、Composio Connector、内置 Skill 与 MCP、Personalization

### 🟡 进行中

- **🎨 Studio** — Live Artifact（Beta）、Editor 的 Edit · Draw · Voice editing
- **⚙️ Setting** — Memory（个人记忆 / 跨项目复用）、Coding Plan

### 🚧 规划中

- **🎨 Studio** — Handoff to Coding Agent（设计→代码最后一公里）
- **👭 Organization** — Workspace · 团队级 Skill & Memory · 项目级 4 档权限（View / Comment / Edit / Private）

> 想反馈优先级？欢迎在 [Issues](https://github.com/nexu-io/open-design/issues) 或 [Discord](https://discord.gg/qhbcCH8Am4) 告诉我们。

## 🤝 Contributing

欢迎所有形式的贡献——新 Skill、新 Design System、Bug 修复、文档翻译。

- Fork & PR 流程：[`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- 加 Skill：丢一个文件夹进 [`skills/`](skills/)，重启 daemon 即生效，详见 [`docs/skills-protocol.md`](../skills-protocol.md)
- 加 Design System：写一份 `DESIGN.md` 放进 [`design-systems/`](design-systems/)
- 提 Bug / Feature：[GitHub Issues](https://github.com/nexu-io/open-design/issues)

## 💬 Community

- 💭 [Discord](https://discord.gg/qhbcCH8Am4)——日常讨论 / Skill 分享 / 求助
- 🐦 [@nexudotio](https://x.com/nexudotio)——产品更新
- 🌟 喜欢就点个 Star，是对我们最大的支持

## 👥 Contributors

感谢每一位推动 Open Design 前进的人——无论是写代码、写文档、提交 Skill / Design System，还是抛出一个犀利的 Issue。下面这面墙是最直接的「谢谢你」。

<a href="https://github.com/nexu-io/open-design/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nexu-io/open-design&max=500&columns=18&anon=0&cache_bust=2026-05-08" alt="Open Design contributors" />
</a>

<br/>

第一次提 PR？欢迎。[`good-first-issue` / `help-wanted`](https://github.com/nexu-io/open-design/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2C%22help+wanted%22) 标签是入口。


## 📊 GitHub Stats

<a href="https://repobeats.axiom.co"><img alt="Repobeats analytics" src="https://repobeats.axiom.co/api/embed/c59ecce40d164b136afd44a153b3b01827e2ec51.svg" width="100%" /></a>

## ⭐ Star History

<a href="https://star-history.com/#nexu-io/open-design&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date" width="640" />
  </picture>
</a>

## 🙏 Built on

Open Design 是开源接力中的一棒。它能跑得起来，离不开以下作者们的先行工作——他们的项目，直接构成了 OD 的底层：

<table>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://www.anthropic.com/"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://www.anthropic.com/"><b>Anthropic</b></a><br/>
  <sub><a href="https://www.anthropic.com/news/claude-design">Claude Design</a></sub><br/>
  <sub>本仓库为之提供开源替代的闭源产品——artifact-first 心智的开创者。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/alchaincyf"><img src="https://github.com/alchaincyf.png" width="64" height="64" style="border-radius:50%" alt="alchaincyf" /></a><br/>
  <a href="https://github.com/alchaincyf"><b>@alchaincyf</b>（花叔）</a><br/>
  <sub><a href="https://github.com/alchaincyf/huashu-design"><code>huashu-design</code>·画术</a></sub><br/>
  <sub>设计哲学的核心——Junior-Designer 工作流、5 步品牌资产协议、anti-AI-slop checklist、五维自评。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/op7418"><img src="https://github.com/op7418.png" width="64" height="64" style="border-radius:50%" alt="op7418" /></a><br/>
  <a href="https://github.com/op7418"><b>@op7418</b>（歸藏）</a><br/>
  <sub><a href="https://github.com/op7418/guizang-ppt-skill"><code>guizang-ppt-skill</code></a></sub><br/>
  <sub>Magazine-web-PPT skill 原样捆绑，Deck 模式的默认实现，P0/P1/P2 checklist 文化的来源。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/multica-ai"><img src="https://github.com/multica-ai.png" width="64" height="64" style="border-radius:50%" alt="multica-ai" /></a><br/>
  <a href="https://github.com/multica-ai"><b>@multica-ai</b></a><br/>
  <sub><a href="https://github.com/multica-ai/multica"><code>multica</code></a></sub><br/>
  <sub>Daemon + adapter 架构、PATH 扫描式 agent 检测、agent-as-teammate 世界观。</sub>
</td>
</tr>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/OpenCoworkAI"><img src="https://github.com/OpenCoworkAI.png" width="64" height="64" style="border-radius:50%" alt="OpenCoworkAI" /></a><br/>
  <a href="https://github.com/OpenCoworkAI"><b>@OpenCoworkAI</b></a><br/>
  <sub><a href="https://github.com/OpenCoworkAI/open-codesign"><code>open-codesign</code></a></sub><br/>
  <sub>第一个开源的 Claude Design 替代——流式 artifact 循环、沙盒 iframe 预览、实时 agent 面板。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/VoltAgent"><img src="https://github.com/VoltAgent.png" width="64" height="64" style="border-radius:50%" alt="VoltAgent" /></a><br/>
  <a href="https://github.com/VoltAgent"><b>@VoltAgent</b></a><br/>
  <sub><a href="https://github.com/VoltAgent/awesome-design-md"><code>awesome-design-md</code></a></sub><br/>
  <sub>9 段式 <code>DESIGN.md</code> schema 的来源，69 套产品体系的导入入口。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/farion1231"><img src="https://github.com/farion1231.png" width="64" height="64" style="border-radius:50%" alt="farion1231" /></a><br/>
  <a href="https://github.com/farion1231"><b>@farion1231</b></a><br/>
  <sub><a href="https://github.com/farion1231/cc-switch"><code>cc-switch</code></a></sub><br/>
  <sub>跨多个 agent CLI 的 symlink 式 skill 分发，灵感与实现参考。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/anthropics"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://github.com/anthropics"><b>@anthropics</b></a><br/>
  <sub><a href="https://docs.anthropic.com/en/docs/claude-code/skills">Claude Code Skills</a></sub><br/>
  <sub><code>SKILL.md</code> 规范原样采纳——任何 Claude Code skill 丢进 <code>skills/</code> 即生效。</sub>
</td>
</tr>
</table>

每一个想法、每一行借鉴的代码，背后都有一位真实的作者。如果你喜欢 Open Design，请也去给他们一个 Star ⭐

## 📄 License

[Apache-2.0](../../LICENSE)

当 Anthropic、OpenAI、Google 把最先进的 AI 设计能力锁进付费墙之后，世界仍然需要另一种声音——**让最前沿的技术回到每一个开发者、设计师、创作者的桌上**。

我们希望有一天能让一个独立设计师不再为订阅费焦虑、让一个还在读书的年轻人也能用上一线工具，做出他人生中第一份拿得出手的作品。

> **Take it. Build with it. Make it yours.**

[cd]: https://www.anthropic.com/news/claude-design
