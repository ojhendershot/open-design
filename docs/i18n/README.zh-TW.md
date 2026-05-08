<h1 align="center">Open Design</h1>

<p align="center">
  <img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/assets/hero.png" alt="Open Design — Open source · Local · Claude Design, but open" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/nexu-io/open-design/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/nexu-io/open-design?style=flat&color=8b5cf6&logo=github" /></a>
  <a href="https://github.com/nexu-io/open-design/network/members"><img alt="Forks" src="https://img.shields.io/github/forks/nexu-io/open-design?style=flat&color=8b5cf6&logo=github" /></a>
  <a href="https://github.com/nexu-io/open-design/issues"><img alt="Issues" src="https://img.shields.io/github/issues/nexu-io/open-design?style=flat&color=8b5cf6&logo=github" /></a>
  <a href="https://github.com/nexu-io/open-design/pulls"><img alt="Pull Requests" src="https://img.shields.io/github/issues-pr/nexu-io/open-design?style=flat&color=8b5cf6&logo=github" /></a>
  <a href="https://github.com/nexu-io/open-design/graphs/contributors"><img alt="Contributors" src="https://img.shields.io/github/contributors/nexu-io/open-design?style=flat&color=8b5cf6&logo=github" /></a>
  <a href="https://github.com/nexu-io/open-design/commits/main"><img alt="Commit activity" src="https://img.shields.io/github/commit-activity/m/nexu-io/open-design?style=flat&color=8b5cf6&logo=git" /></a>
  <a href="https://github.com/nexu-io/open-design/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/nexu-io/open-design?style=flat&color=8b5cf6&logo=git" /></a>
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
  <a href="../../README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> ·
  <b>繁體中文</b> · <a href="README.ja-JP.md">日本語</a> ·
  <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a> ·
  <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> ·
  <a href="README.pt-BR.md">Português</a> · <a href="README.ru.md">Русский</a> ·
  <a href="README.ar.md">العربية</a> · <a href="README.tr.md">Türkçe</a> ·
  <a href="README.uk.md">Українська</a>
</p>

<br/>

> **[Claude Design][cd] 的開源替代。** 本地優先，支援 OpenClaw、Claude Code、Hermes Agent 等 **16 個 Coding Agent** 直接執行。
>
> **129 個品牌設計體系**——Linear / Stripe / Apple / Notion 等任意切換。
>
> **31 個 Skill**——原型 / Live Artifact / Slides / 圖片 / 影片 / 音訊全覆蓋。

---

## 📋 What

✨ **Open Design（OD）是一個用自然語言生成成品設計稿的開源工作台。**

📝 用一句話描述你的設計需求，即可產出可直接交付的原型、Live Artifact、Slides、圖片、影片、音訊——🎨 出品對標資深設計師水準，而非千篇一律的 AI 風格。

📤 支援 HTML、PDF、PPT、ZIP、Markdown 等多種格式匯出。

🤖 由 **Coding Agent 驅動**（Claude Code / Codex / Cursor Agent / OpenClaw 等任選），📂 所有 Skill 和 Design System 都是專案裡的 Markdown 檔案——你可以隨時編輯、複製、分享。

💻 **本地優先**，所有資料與執行環境完全在你自己的裝置上。

## 💡 Why

🚀 2026 年 4 月，Anthropic 發佈了 [Claude Design][cd]，**第一次讓 LLM 真正做設計**——不是寫一篇關於設計的文章，而是**直接產出一份能用的設計稿**。

🔒 但它**閉源、付費、只跑在雲端**，模型也只能用 Anthropic 自家的。**換 Agent、自部署、BYOK，全都做不到**。

🔓 Open Design 想讓同樣的能力變得開放：**模型自由選擇、密鑰自主管理、Skill 與設計體系皆為可編輯的本地檔案**，整套系統在你自己的裝置上執行。

🤝 我們不打算重新造一個 Agent——你電腦上的 Claude Code、Codex、Cursor Agent 已經足夠強大。**OD 做的，是把它們接進一個完整的設計工作流。**

## 🆚 Difference from other solutions

| | Claude Design | Figma | Lovable / v0 / Bolt | **Open Design** |
|---|---|---|---|---|
| **開源** | ❌ | ❌ | ❌ | ✅ Apache-2.0 |
| **本地執行** | ❌ 僅雲端 | ❌ 資料強依賴雲端 | ❌ 僅雲端 | ✅ daemon + 桌面版 |
| **Agent** | 鎖 Anthropic | Make 模式鎖自家 | 鎖自家模型 | ✅ 16 個 CLI 任選 |
| **BYOK** | ❌ | ❌ | 部分 | ✅ Anthropic / OpenAI / Azure / Google |
| **品牌設計體系** | 內建但不可換 | 團隊 Library（私域） | 主題 JSON | ✅ 129 個 Markdown 體系，可自訂 |
| **Skill 擴充** | 閉源 | Plugin 市集（受平台審核） | 閉源 | ✅ 拖入資料夾即生效 |
| **場景** | 通用設計 | UI / 原型 / 協作 | 偏代碼原型 | ✅ 設計 / 行銷 / 營運 / 產品 / 財務 / HR |

## 🖼️ Demo

按四類核心產物展示：

### 📐 原型（Prototype）

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/gamified-app.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><code>gamified-app</code></a> · 遊戲化行動端原型——三屏暗色舞台 + XP 進度條 + 任務卡</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/social-carousel.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><code>social-carousel</code></a> · 社群媒體三連圖——1080×1080，標題串聯，循環呼應</sub></td>
</tr>
</table>

### 🎞️ Slide

<table>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/kami-deck.png" width="380"/><br/><sub><b>Kami Deck</b>——「Designing intelligence on warm paper」雜誌風開場頁</sub></td>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/open-design-landing-deck.png" width="380"/><br/><sub><b>Open Design Landing Deck</b>——產品落地頁風格的演示稿</sub></td>
</tr>
</table>

### 🖼️ 圖片

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/3d-stone-staircase-evolution-infographic.json"><img src="https://cms-assets.youmind.com/media/1776661968404_8a5flm_HGQc_KOaMAA2vt0.jpg" width="380"/></a><br/><sub><b>3D Stone Staircase Evolution Infographic</b>——三段式資訊圖，石刻質感</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/profile-avatar-glamorous-woman-in-black-portrait.json"><img src="https://cms-assets.youmind.com/media/1777453184257_vb9hvl_HG9tAkOa4AAuRrn.jpg" width="380"/></a><br/><sub><b>Glamorous Woman in Black Portrait</b>——編輯級影棚人像</sub></td>
</tr>
</table>

### 🎬 影片

<table>
<tr>
<td width="50%"><a href="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/downloads/default.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Luxury Supercar Cinematic</b>——敘事產品片，點擊播放 MP4</sub></td>
<td width="50%"><a href="https://github.com/YouMind-OpenLab/awesome-seedance-2-prompts/releases/download/videos/1402.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7f63ad253175a9ad1dac53de490efac8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Japanese Romance Short Film</b>——15s Seedance 2.0 敘事片</sub></td>
</tr>
</table>

## 🎯 Use cases

### 🎨 設計師

**現有流程**：在 Figma 裡一幀幀畫原型，反覆對齊品牌規範，再切圖給前端；改版時多套設計稿手動同步。

**痛點**：起稿耗時長、品牌切換靠手動改元件、和工程的交付沒有「同一份真實來源」。

**OpenDesign**：用 Sketch 草圖代替 prompt 描述結構，Agent 直接生成程式碼原型；切換 Design System 自動套用新品牌的色板/字體/間距；雙軌評論讓自留 note 和給 Agent 的修改指令分離，最終一份 HTML 既是設計稿也是工程產物。

---

### 📋 產品經理

**現有流程**：Notion 寫 PRD → Figma 拼線框圖 → Keynote 做匯報 deck → 三套文件手動對齊。

**痛點**：三個工具來回切、版本永遠不一致、想給老闆看一個「會動的 demo」要排期等開發。

**OpenDesign**：自然語言直接產出 PM Spec 文件（帶 TOC + 決策日誌）；雜誌風 Slides 一句話出種子輪 pitch deck；Live Artifact 接 Notion / Linear 真實資料，五分鐘做出可演示的產品原型，不用排期等開發。

---

### 💻 開發者

**現有流程**：用 v0 / Bolt 起原型，但模型和 Key 都被鎖在雲端；想把 Skill 沉澱成團隊資產，發現沒法 fork。

**痛點**：資料外流、token 成本不可控、擴充能力受平台審核、設計到程式碼的交接靠人工翻譯。

**OpenDesign**：BYOK 接自有 LLM 閘道，所有專案資料落本地 SQLite；Skill 是 `SKILL.md` + `assets/` 資料夾，丟進 `skills/` 即生效；Handoff to Coding Agent 把設計稿原樣交給 Cursor / Claude Code 接手開發，上下文不丟。

---

### 📣 行銷 & 營運

**現有流程**：每出一波活動都要找設計排期出圖，節奏慢；多平台尺寸（IG / Threads / TikTok）靠手工裁切適配。

**痛點**：等設計排期、改字改色都要重做、社群一週出五十張圖人力扛不住。

**OpenDesign**：一次 prompt 出 6 張並排社群卡片變體（IG 封面 / Threads 頭圖 / TikTok 直版）任選；週報 / OKR / 看板用 Live Artifact 直接接 Notion / Linear / Slack 資料源，發布一次後續自動更新，不用每週重做。

## 🚀 Getting started

按你的使用場景，三種方式任選其一：

### 1️⃣ 下載客戶端（最快，零配置）

最簡單的上手方式——下完即用，自動偵測 PATH 上的 Coding Agent，本地 SQLite 持久化專案。

- 桌面版（macOS Apple Silicon · Windows x64）：[open-design.ai](https://open-design.ai/)
- 歷史版本：[GitHub Releases](https://github.com/nexu-io/open-design/releases)

適合：個人使用者、設計師、PM——只想點開就開始幹活。

### 2️⃣ 一鍵部署到雲端（團隊共享）

把 Web 層部署到 Vercel，整套團隊共用，BYOK 憑證可走環境變數；daemon 部分仍可本地或自建伺服器跑，前後端分離。

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/nexu-io/open-design"><img alt="Deploy to Vercel" src="https://img.shields.io/badge/Deploy_to-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  <a href="https://railway.app/new/template?template=https://github.com/nexu-io/open-design"><img alt="Deploy to Railway" src="https://img.shields.io/badge/Deploy_to-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" /></a>
  <a href="../deploy.md"><img alt="Self-host with Docker" src="https://img.shields.io/badge/Self--host-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" /></a>
</p>

完整部署指南：[`docs/deploy.md`](../deploy.md)

適合：小團隊、新創公司——希望團隊共用一份資產庫 + 設計體系，但不想維運基礎設施。

### 3️⃣ 自己動手部署（完全自主）

Clone 原始碼本地跑，daemon + Web + 可選 Electron 桌面殼子全棧在你機器上：

```bash
git clone https://github.com/nexu-io/open-design
cd open-design
pnpm install
pnpm tools-dev start
# → http://localhost:3000
```

完整 Quickstart：[`QUICKSTART.md`](../../QUICKSTART.md) · 架構與選項：[`docs/architecture.md`](../architecture.md)

適合：開發者、企業自部署——需要 fork 程式碼、加自訂 Skill、串接內部 LLM 閘道。

---

**深入文件**

| | |
|---|---|
| 📐 [Architecture](../architecture.md) | daemon · 協定解析 · BYOK 代理 |
| 🧠 [Philosophy](../philosophy.md) | Junior-Designer 模式 · 5 維自評 · 反 AI-slop |
| 🤖 [Agents](../agents.md) | 16 CLI 詳解 |
| 🎨 [Design Systems](../design-systems.md) | 129 個內建體系 |
| 🛠️ [Skills](../../skills/) | 31 個 Skill 目錄 |

## 🗺️ Roadmap

### ✅ 已上線

- **🏠 Home** — 資產庫（My Design / Templates / Brand Systems）
- **🎨 Studio** — Prototype / Slides / Media / Import 4 種起步、Chat + File Manage + Sketch 草圖 + 沙盒 Preview、Editor 的 Tweaks · Comment · Present、HTML/PDF/PPT/ZIP/MD 多格式匯出
- **⚙️ Setting** — Execute Mode（Harness / BYOK）、14 家 Media Provider、Composio Connector、內建 Skill 與 MCP、Personalization

### 🟡 進行中

- **🎨 Studio** — Live Artifact（Beta）、Editor 的 Edit · Draw · Voice editing
- **⚙️ Setting** — Memory（個人記憶 / 跨專案複用）、Coding Plan

### 🚧 規劃中

- **🎨 Studio** — Handoff to Coding Agent（設計→程式碼最後一哩）
- **👭 Organization** — Workspace · 團隊級 Skill & Memory · 專案級 4 檔權限（View / Comment / Edit / Private）

> 想反映優先順序？歡迎在 [Issues](https://github.com/nexu-io/open-design/issues) 或 [Discord](https://discord.gg/qhbcCH8Am4) 告訴我們。

## 🤝 Contributing

歡迎所有形式的貢獻——新 Skill、新 Design System、Bug 修復、文件翻譯。

- Fork & PR 流程：[`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- 加 Skill：丟一個資料夾進 [`skills/`](../../skills/)，重啟 daemon 即生效，詳見 [`docs/skills-protocol.md`](../skills-protocol.md)
- 加 Design System：寫一份 `DESIGN.md` 放進 [`design-systems/`](../../design-systems/)
- 提 Bug / Feature：[GitHub Issues](https://github.com/nexu-io/open-design/issues)

## 💬 Community

- 💭 [Discord](https://discord.gg/qhbcCH8Am4)——日常討論 / Skill 分享 / 求助
- 🐦 [@nexudotio](https://x.com/nexudotio)——產品更新
- 🌟 喜歡就點個 Star，是對我們最大的支持

## 👥 Contributors

感謝每一位推動 Open Design 前進的人——無論是寫程式碼、寫文件、提交 Skill / Design System，還是拋出一個犀利的 Issue。下面這面牆是最直接的「謝謝你」。

<a href="https://github.com/nexu-io/open-design/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nexu-io/open-design&max=500&columns=18&anon=0&cache_bust=2026-05-08" alt="Open Design contributors" />
</a>

<br/>

第一次提 PR？歡迎。[`good-first-issue` / `help-wanted`](https://github.com/nexu-io/open-design/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2C%22help+wanted%22) 標籤是入口。

## ⭐ Star History

<a href="https://star-history.com/#nexu-io/open-design&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date" width="640" />
  </picture>
</a>

## 🙏 Built on

Open Design 是開源接力中的一棒。它能跑得起來，離不開以下作者們的先行工作——他們的專案，直接構成了 OD 的底層：

<table>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://www.anthropic.com/"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://www.anthropic.com/"><b>Anthropic</b></a><br/>
  <sub><a href="https://www.anthropic.com/news/claude-design">Claude Design</a></sub><br/>
  <sub>本倉庫為之提供開源替代的閉源產品——artifact-first 心智的開創者。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/alchaincyf"><img src="https://github.com/alchaincyf.png" width="64" height="64" style="border-radius:50%" alt="alchaincyf" /></a><br/>
  <a href="https://github.com/alchaincyf"><b>@alchaincyf</b>（花叔）</a><br/>
  <sub><a href="https://github.com/alchaincyf/huashu-design"><code>huashu-design</code>·畫術</a></sub><br/>
  <sub>設計哲學的核心——Junior-Designer 工作流、5 步品牌資產協定、anti-AI-slop checklist、五維自評。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/op7418"><img src="https://github.com/op7418.png" width="64" height="64" style="border-radius:50%" alt="op7418" /></a><br/>
  <a href="https://github.com/op7418"><b>@op7418</b>（歸藏）</a><br/>
  <sub><a href="https://github.com/op7418/guizang-ppt-skill"><code>guizang-ppt-skill</code></a></sub><br/>
  <sub>Magazine-web-PPT skill 原樣捆綁，Deck 模式的預設實作，P0/P1/P2 checklist 文化的來源。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/multica-ai"><img src="https://github.com/multica-ai.png" width="64" height="64" style="border-radius:50%" alt="multica-ai" /></a><br/>
  <a href="https://github.com/multica-ai"><b>@multica-ai</b></a><br/>
  <sub><a href="https://github.com/multica-ai/multica"><code>multica</code></a></sub><br/>
  <sub>Daemon + adapter 架構、PATH 掃描式 agent 偵測、agent-as-teammate 世界觀。</sub>
</td>
</tr>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/OpenCoworkAI"><img src="https://github.com/OpenCoworkAI.png" width="64" height="64" style="border-radius:50%" alt="OpenCoworkAI" /></a><br/>
  <a href="https://github.com/OpenCoworkAI"><b>@OpenCoworkAI</b></a><br/>
  <sub><a href="https://github.com/OpenCoworkAI/open-codesign"><code>open-codesign</code></a></sub><br/>
  <sub>第一個開源的 Claude Design 替代——streaming-artifact 流式範式、沙盒 iframe 預覽、即時 agent 面板。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/VoltAgent"><img src="https://github.com/VoltAgent.png" width="64" height="64" style="border-radius:50%" alt="VoltAgent" /></a><br/>
  <a href="https://github.com/VoltAgent"><b>@VoltAgent</b></a><br/>
  <sub><a href="https://github.com/VoltAgent/awesome-design-md"><code>awesome-design-md</code></a></sub><br/>
  <sub>9 段式 <code>DESIGN.md</code> schema 的來源，69 套產品體系的匯入入口。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/farion1231"><img src="https://github.com/farion1231.png" width="64" height="64" style="border-radius:50%" alt="farion1231" /></a><br/>
  <a href="https://github.com/farion1231"><b>@farion1231</b></a><br/>
  <sub><a href="https://github.com/farion1231/cc-switch"><code>cc-switch</code></a></sub><br/>
  <sub>跨多個 agent CLI 的 symlink 式 skill 分發，靈感與實作參考。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/anthropics"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://github.com/anthropics"><b>@anthropics</b></a><br/>
  <sub><a href="https://docs.anthropic.com/en/docs/claude-code/skills">Claude Code Skills</a></sub><br/>
  <sub><code>SKILL.md</code> 規範原樣採納——任何 Claude Code skill 丟進 <code>skills/</code> 即生效。</sub>
</td>
</tr>
</table>

每一個想法、每一行借鑑的程式碼，背後都有一位真實的作者。如果你喜歡 Open Design，請也去給他們一個 Star ⭐

## 📄 License

[Apache-2.0](../../LICENSE)

當 Anthropic、OpenAI、Google 把最先進的 AI 設計能力鎖進付費牆之後，世界仍然需要另一種聲音——**讓最前沿的技術回到每一個開發者、設計師、創作者的桌上**。

我們希望有一天能讓一個獨立設計師不再為訂閱費焦慮、讓一個還在讀書的年輕人也能用上一線工具，做出他人生中第一份拿得出手的作品。

> **Take it. Build with it. Make it yours.**

[cd]: https://www.anthropic.com/news/claude-design
