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
  <a href="../../README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.zh-TW.md">繁體中文</a> · <b>日本語</b> ·
  <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a> ·
  <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> ·
  <a href="README.pt-BR.md">Português</a> · <a href="README.ru.md">Русский</a> ·
  <a href="README.ar.md">العربية</a> · <a href="README.tr.md">Türkçe</a> ·
  <a href="README.uk.md">Українська</a>
</p>

<br/>

> **[Claude Design][cd] のオープンソース代替。** ローカルファースト、OpenClaw、Claude Code、Hermes Agent など **16 種の Coding Agent** をそのまま実行。
>
> **129 種のブランドデザインシステム** ── Linear / Stripe / Apple / Notion など、ワンクリックで切替。
>
> **31 個の Skill** ── プロトタイプ / Live Artifact / Slides / 画像 / 動画 / 音声まで完全カバー。

---

## 📋 What

✨ **Open Design（OD）は [Claude Design][cd] のオープンソース代替 ── 自然言語から完成品の設計成果物を生成するオープンソースのワークスペースです。**

📝 一文でデザインを記述すると、納品可能なプロトタイプ、Live Artifact、Slides、画像、動画、音声を出力します ── 🎨 ベテランデザイナー水準のクラフトであり、よくある AI 風の没個性ではありません。

📤 HTML、PDF、PPT、ZIP、Markdown など多形式で書き出し可能。

🤖 **Coding Agent** が駆動（Claude Code / Codex / Cursor Agent / OpenClaw など、お好みで）。📂 すべての Skill と Design System はプロジェクト内の Markdown ファイル ── 自由に編集・複製・共有できます。

💻 **ローカルファースト**。すべてのデータと実行環境はあなたの端末上で完結します。

## 💡 Why

🚀 2026 年 4 月、Anthropic は [Claude Design][cd] を発表し、**LLM が初めて本当の意味でデザインできる** ことを示しました ── デザインを論じる文章ではなく、**そのまま使える設計成果物そのもの** を出力したのです。

🔒 しかしそれは **クローズドソース、有料、クラウド限定** で、モデルも Anthropic 自社のものに固定されています。Agent の差し替え、セルフホスト、BYOK ── どれもできません。

🔓 Open Design は同じ能力をオープンにします。**モデルは自由選択、鍵は手元、Skill とデザインシステムは編集可能なローカルファイル**、システム全体があなたの端末で動きます。

🤝 新しい Agent を作るつもりはありません。あなたのマシンにある Claude Code、Codex、Cursor Agent はすでに十分強力です。**OD がやるのは、それらを完全な設計ワークフローに繋ぐことだけです。**

## 🆚 Difference from other solutions

| | Claude Design | Figma | Lovable / v0 / Bolt | **Open Design** |
|---|---|---|---|---|
| **オープンソース** | ❌ | ❌ | ❌ | ✅ Apache-2.0 |
| **ローカル実行** | ❌ クラウドのみ | ❌ データはクラウド依存 | ❌ クラウドのみ | ✅ daemon + デスクトップ版 |
| **Agent** | Anthropic 固定 | Make モードで自社固定 | 自社モデル固定 | ✅ 16 種の CLI から選択可 |
| **BYOK** | ❌ | ❌ | 一部 | ✅ Anthropic / OpenAI / Azure / Google |
| **ブランド設計体系** | 内蔵・差替不可 | チームライブラリ（私有） | テーマ JSON | ✅ 129 種の Markdown 体系、自由カスタマイズ |
| **Skill 拡張** | クローズド | プラグインマーケット（審査付き） | クローズド | ✅ フォルダを置くだけ |
| **シナリオ** | 汎用デザイン | UI / プロトタイプ / 協業 | コード寄りプロト | ✅ デザイン / マーケ / 運用 / プロダクト / 財務 / HR |

## 🖼️ Demo

4 種類のコア成果物：

### 📐 プロトタイプ（Prototype）

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/gamified-app.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><code>gamified-app</code></a> · ゲーム化モバイルプロト ── 三画面のダークステージ + XP バー + クエストカード</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/social-carousel.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><code>social-carousel</code></a> · ソーシャル三連投稿 ── 1080×1080、見出しが連結し循環</sub></td>
</tr>
</table>

### 🎞️ Slide

<table>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/kami-deck.png" width="380"/><br/><sub><b>Kami Deck</b> ──「Designing intelligence on warm paper」マガジン風カバー</sub></td>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/open-design-landing-deck.png" width="380"/><br/><sub><b>Open Design Landing Deck</b> ── ランディングページ風プレゼン</sub></td>
</tr>
</table>

### 🖼️ 画像

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/3d-stone-staircase-evolution-infographic.json"><img src="https://cms-assets.youmind.com/media/1776661968404_8a5flm_HGQc_KOaMAA2vt0.jpg" width="380"/></a><br/><sub><b>3D Stone Staircase Evolution Infographic</b> ── 石造り質感の三段インフォグラフィック</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/profile-avatar-glamorous-woman-in-black-portrait.json"><img src="https://cms-assets.youmind.com/media/1777453184257_vb9hvl_HG9tAkOa4AAuRrn.jpg" width="380"/></a><br/><sub><b>Glamorous Woman in Black Portrait</b> ── エディトリアル・スタジオ・ポートレート</sub></td>
</tr>
</table>

### 🎬 動画

<table>
<tr>
<td width="50%"><a href="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/downloads/default.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Luxury Supercar Cinematic</b> ── ナラティブ・プロダクト・フィルム、クリックで MP4 再生</sub></td>
<td width="50%"><a href="https://github.com/YouMind-OpenLab/awesome-seedance-2-prompts/releases/download/videos/1402.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7f63ad253175a9ad1dac53de490efac8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Japanese Romance Short Film</b> ── 15 秒の Seedance 2.0 ナラティブ</sub></td>
</tr>
</table>

## 🎯 Use cases

### 🎨 デザイナー

**現在のフロー**：Figma で 1 フレームずつ作成し、ブランドガイドに繰り返し合わせ、エンジニアへ受け渡し。バージョン違いは手作業で同期。

**痛み**：起稿に時間がかかる、ブランド差替えが手作業、デザインと開発の Single Source of Truth がない。

**OpenDesign**：プロンプトで構造を説明する代わりにキャンバス上のスケッチで指示 ── Agent がそこからコード化されたプロトタイプを生成。Design System を切り替えればパレット・タイプ・スペーシングが自動連動。デュアルトラック・コメントで「自分のメモ」と「Agent への指示」を分離。最終 HTML が設計とエンジニアリングの両方を担います。

---

### 📋 プロダクトマネージャー

**現在のフロー**：Notion で PRD → Figma でワイヤー → Keynote で報告デッキ → 3 種を手動で同期。

**痛み**：3 ツールを行き来、永遠に同期が取れない、上司に「動くデモ」を見せるのに開発を待つ。

**OpenDesign**：自然言語から PM Spec ドキュメント（TOC + 意思決定ログ付き）を直生成。マガジン風 Slides で一文からシードラウンドのピッチデッキ。Live Artifact が Notion / Linear の実データを取り込み、5 分で動くプロダクトデモを実現。

---

### 💻 エンジニア

**現在のフロー**：v0 / Bolt でプロト立ち上げ ── が、モデルとキーはクラウドにロックイン。チームの Skill を fork したいが、できない。

**痛み**：データが境界外へ流出、トークン消費が制御不能、拡張は審査ゲート、デザイン→コードの引き継ぎは人手翻訳。

**OpenDesign**：BYOK で自前 LLM ゲートウェイへ接続、すべてのプロジェクトは手元の SQLite に保存。Skill は `SKILL.md` + `assets/` フォルダ ── `skills/` に置くだけ。Handoff to Coding Agent で設計をそのまま Cursor / Claude Code に引き渡し、文脈を失いません。

---

### 📣 マーケ & 運用

**現在のフロー**：施策ごとにデザインの空きを待つ。プラットフォーム別サイズ（X / Instagram / TikTok）は手作業でクロップ。

**痛み**：デザイン待ち、文言・色変更は毎回作り直し、週 50 枚は人手では持続不可能。

**OpenDesign**：1 プロンプトで 6 枚並列のソーシャルカード生成（X カバー / Instagram ヘッダー / TikTok 縦版から選択）。週次レポート / OKR / カンバンは Live Artifact で Notion / Linear / Slack に直結 ── 一度公開すれば自動更新。

## 🚀 Getting started

3 つの方法から、用途に合うものを：

### 1️⃣ デスクトップ版をダウンロード（最速・設定不要）

最もシンプルな方法 ── インストール後すぐ使え、`PATH` 上の Coding Agent を自動検出。プロジェクトはローカル SQLite に永続化。

- デスクトップ版（macOS Apple Silicon · Windows x64）：[open-design.ai](https://open-design.ai/)
- 過去のリリース：[GitHub Releases](https://github.com/nexu-io/open-design/releases)

向いている人：個人ユーザー、デザイナー、PM ── クリックしてすぐ作業を始めたい人。

### 2️⃣ クラウドへワンクリック・デプロイ（チーム共有）

Web 層を Vercel にデプロイし、チームで共有。BYOK の認証情報は環境変数で渡せます。daemon は引き続きローカルか自前サーバーで実行可能 ── フロント/バックを分離した構成。

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/nexu-io/open-design"><img alt="Deploy to Vercel" src="https://img.shields.io/badge/Deploy_to-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  <a href="https://railway.app/new/template?template=https://github.com/nexu-io/open-design"><img alt="Deploy to Railway" src="https://img.shields.io/badge/Deploy_to-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" /></a>
  <a href="../deploy.md"><img alt="Self-host with Docker" src="https://img.shields.io/badge/Self--host-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" /></a>
</p>

完全なデプロイガイド：[`docs/deploy.md`](../deploy.md)

向いている人：小規模チーム、スタートアップ ── 共通のアセットライブラリ + デザイン体系が欲しいが、インフラ運用はしたくない。

### 3️⃣ ソースから自前デプロイ（完全な制御）

リポジトリを clone してフルスタック（daemon + Web + 任意の Electron シェル）を自分のマシンで実行：

```bash
git clone https://github.com/nexu-io/open-design
cd open-design
pnpm install
pnpm tools-dev start
# → http://localhost:3000
```

完全な Quickstart：[`QUICKSTART.md`](../../QUICKSTART.md) · アーキテクチャと選択肢：[`docs/architecture.md`](../architecture.md)

向いている人：開発者、エンタープライズの自前ホスト ── コードを fork し、独自 Skill を追加し、社内 LLM ゲートウェイへ接続したい。

---

**詳細ドキュメント**

| | |
|---|---|
| 📐 [Architecture](../architecture.md) | daemon · プロトコル解析 · BYOK プロキシ |
| 🧠 [Philosophy](../philosophy.md) | Junior-Designer モード · 5 軸自己批評 · anti-AI-slop |
| 🤖 [Agents](../agents.md) | 16 CLI 詳細 |
| 🎨 [Design Systems](../design-systems.md) | 129 種の内蔵体系 |
| 🛠️ [Skills](../../skills/) | 31 Skill カタログ |

## 🗺️ Roadmap

### ✅ リリース済み

- **🏠 Home** — アセットライブラリ（My Design / Templates / Brand Systems）
- **🎨 Studio** — 4 つの起点（Prototype / Slides / Media / Import）、Chat + ファイル管理 + Sketch + サンドボックス Preview、Editor の Tweaks · Comment · Present、HTML/PDF/PPT/ZIP/MD 書き出し
- **⚙️ Setting** — Execute Mode（Harness / BYOK）、14 種の Media Provider、Composio Connector、内蔵 Skill と MCP、パーソナライズ

### 🟡 進行中

- **🎨 Studio** — Live Artifact（Beta）、Editor の Edit · Draw · Voice editing
- **⚙️ Setting** — Memory（個人記憶 / プロジェクト横断再利用）、Coding Plan

### 🚧 計画中

- **🎨 Studio** — Handoff to Coding Agent（設計→コード、最後の 1 km）
- **👭 Organization** — Workspace · チーム単位の Skill & Memory · プロジェクト単位の 4 段階権限（View / Comment / Edit / Private）

> 優先度のフィードバックがありますか？[Issues](https://github.com/nexu-io/open-design/issues) または [Discord](https://discord.gg/qhbcCH8Am4) でお知らせください。

## 🤝 Contributing

あらゆる形の貢献を歓迎します ── 新しい Skill、新しい Design System、バグ修正、翻訳。

- Fork & PR の流れ：[`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Skill 追加：[`skills/`](../../skills/) にフォルダを置き daemon を再起動。詳細は [`docs/skills-protocol.md`](../skills-protocol.md)
- Design System 追加：`DESIGN.md` を書いて [`design-systems/`](../../design-systems/) に置く
- バグ / 機能要望：[GitHub Issues](https://github.com/nexu-io/open-design/issues)

## 💬 Community

- 💭 [Discord](https://discord.gg/qhbcCH8Am4) ── 日々のディスカッション、Skill 共有、ヘルプ
- 🐦 [@nexudotio](https://x.com/nexudotio) ── プロダクト更新
- 🌟 Open Design が気に入ったら、ぜひ Star を ── 大きな支えになります。

## 👥 Contributors

Open Design を前進させてくれたすべての方へ ── コード、ドキュメント、Skill、Design System、鋭い Issue を通じて。下のウォールが、最も率直な「ありがとう」です。

<a href="https://github.com/nexu-io/open-design/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nexu-io/open-design&max=500&columns=18&anon=0&cache_bust=2026-05-08" alt="Open Design contributors" />
</a>

<br/>

初めての PR ですか？歓迎します。[`good-first-issue` / `help-wanted`](https://github.com/nexu-io/open-design/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2C%22help+wanted%22) ラベルが入口です。


## 📊 GitHub Stats

<a href="https://repobeats.axiom.co"><img alt="Repobeats analytics" src="https://repobeats.axiom.co/api/embed/nexu-io/open-design.svg" width="100%" /></a>

## ⭐ Star History

<a href="https://star-history.com/#nexu-io/open-design&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date" width="640" />
  </picture>
</a>

## 🙏 Built on

Open Design はオープンソースのリレーの一区間です。これらの作者の先行プロジェクトが、OD の土台を直接形成しています：

<table>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://www.anthropic.com/"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://www.anthropic.com/"><b>Anthropic</b></a><br/>
  <sub><a href="https://www.anthropic.com/news/claude-design">Claude Design</a></sub><br/>
  <sub>本リポジトリがオープンソース代替を提供する対象 ── artifact-first メンタルモデルの開拓者。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/alchaincyf"><img src="https://github.com/alchaincyf.png" width="64" height="64" style="border-radius:50%" alt="alchaincyf" /></a><br/>
  <a href="https://github.com/alchaincyf"><b>@alchaincyf</b>（華叔）</a><br/>
  <sub><a href="https://github.com/alchaincyf/huashu-design"><code>huashu-design</code></a></sub><br/>
  <sub>デザイン哲学のコア ── Junior-Designer ワークフロー、5 ステップ・ブランド資産プロトコル、anti-AI-slop チェックリスト、5 軸自己批評。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/op7418"><img src="https://github.com/op7418.png" width="64" height="64" style="border-radius:50%" alt="op7418" /></a><br/>
  <a href="https://github.com/op7418"><b>@op7418</b>（歸藏）</a><br/>
  <sub><a href="https://github.com/op7418/guizang-ppt-skill"><code>guizang-ppt-skill</code></a></sub><br/>
  <sub>Magazine-web-PPT skill をそのまま同梱、Deck モードのデフォルト実装、P0/P1/P2 チェックリスト文化の出所。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/multica-ai"><img src="https://github.com/multica-ai.png" width="64" height="64" style="border-radius:50%" alt="multica-ai" /></a><br/>
  <a href="https://github.com/multica-ai"><b>@multica-ai</b></a><br/>
  <sub><a href="https://github.com/multica-ai/multica"><code>multica</code></a></sub><br/>
  <sub>Daemon + adapter アーキテクチャ、PATH スキャン式 agent 検出、agent-as-teammate の世界観。</sub>
</td>
</tr>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/OpenCoworkAI"><img src="https://github.com/OpenCoworkAI.png" width="64" height="64" style="border-radius:50%" alt="OpenCoworkAI" /></a><br/>
  <a href="https://github.com/OpenCoworkAI"><b>@OpenCoworkAI</b></a><br/>
  <sub><a href="https://github.com/OpenCoworkAI/open-codesign"><code>open-codesign</code></a></sub><br/>
  <sub>初のオープンソース Claude Design 代替 ── streaming-artifact ループ、サンドボックス iframe プレビュー、リアルタイム agent パネル。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/VoltAgent"><img src="https://github.com/VoltAgent.png" width="64" height="64" style="border-radius:50%" alt="VoltAgent" /></a><br/>
  <a href="https://github.com/VoltAgent"><b>@VoltAgent</b></a><br/>
  <sub><a href="https://github.com/VoltAgent/awesome-design-md"><code>awesome-design-md</code></a></sub><br/>
  <sub>9 セクション <code>DESIGN.md</code> スキーマの出所、69 のプロダクト体系のインポート経路。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/farion1231"><img src="https://github.com/farion1231.png" width="64" height="64" style="border-radius:50%" alt="farion1231" /></a><br/>
  <a href="https://github.com/farion1231"><b>@farion1231</b></a><br/>
  <sub><a href="https://github.com/farion1231/cc-switch"><code>cc-switch</code></a></sub><br/>
  <sub>複数の agent CLI にまたがる symlink 式 skill 配布の発想と実装リファレンス。</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/anthropics"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://github.com/anthropics"><b>@anthropics</b></a><br/>
  <sub><a href="https://docs.anthropic.com/en/docs/claude-code/skills">Claude Code Skills</a></sub><br/>
  <sub><code>SKILL.md</code> 規約をそのまま採用 ── Claude Code の skill を <code>skills/</code> に置けば動作。</sub>
</td>
</tr>
</table>

すべてのアイデア、借用したコードの背後には、実在の作者がいます。Open Design が気に入ったら、ぜひ彼らにも Star を ⭐

## 📄 License

[Apache-2.0](../../LICENSE)

Anthropic、OpenAI、Google が最先端の AI デザイン能力を有料の壁の向こうへ閉じ込めても、世界はもう一つの声を必要とします ── **最先端のテクノロジーを、すべての開発者・デザイナー・クリエイターの机上に取り戻すこと**。

いつの日か、独立したデザイナーがサブスク料金に怯えなくて済み、まだ学校に通う若者が一線級のツールを使って、人生最初の自慢できる作品を生み出せるように。

> **Take it. Build with it. Make it yours.**

[cd]: https://www.anthropic.com/news/claude-design
