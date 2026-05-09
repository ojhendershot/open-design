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
  <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja-JP.md">日本語</a> ·
  <b>한국어</b> · <a href="README.es.md">Español</a> ·
  <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> ·
  <a href="README.pt-BR.md">Português</a> · <a href="README.ru.md">Русский</a> ·
  <a href="README.ar.md">العربية</a> · <a href="README.tr.md">Türkçe</a> ·
  <a href="README.uk.md">Українська</a>
</p>

<br/>

> **[Claude Design][cd]의 오픈소스 대안.** 로컬 우선, OpenClaw, Claude Code, Hermes Agent 등 **16개의 Coding Agent**를 그대로 실행.
>
> **129개의 브랜드 디자인 시스템** ── Linear / Stripe / Apple / Notion 등을 한 번의 클릭으로 전환.
>
> **31개의 Skill** ── 프로토타입 / Live Artifact / Slides / 이미지 / 비디오 / 오디오까지 완전 커버.

---

## 📋 What

✨ **Open Design (OD)는 [Claude Design][cd]의 오픈소스 대안 ── 자연어를 통해 완성된 디자인 산출물을 생성하는 오픈소스 워크스페이스입니다.**

📝 한 문장으로 디자인을 설명하면, 곧바로 납품 가능한 프로토타입, Live Artifact, Slides, 이미지, 비디오, 오디오를 만들어 냅니다 ── 🎨 시니어 디자이너 수준의 완성도이며, 흔한 AI 같은 결과물이 아닙니다.

📤 HTML, PDF, PPT, ZIP, Markdown 등 다양한 형식으로 내보내기 지원.

🤖 **Coding Agent** 기반(Claude Code / Codex / Cursor Agent / OpenClaw 등 자유 선택). 📂 모든 Skill과 Design System은 프로젝트 내의 Markdown 파일 ── 언제든지 편집·복제·공유할 수 있습니다.

💻 **로컬 우선**, 모든 데이터와 실행 환경이 본인의 기기 위에서 동작합니다.

## 💡 Why

🚀 2026년 4월, Anthropic은 [Claude Design][cd]을 공개해 **LLM이 처음으로 진짜 디자인을 할 수 있다는 것**을 보여주었습니다 ── 디자인에 대한 글이 아니라, **그대로 쓸 수 있는 디자인 산출물 자체**를 출력했습니다.

🔒 그러나 그것은 **클로즈드 소스, 유료, 클라우드 전용**이며 모델은 Anthropic 자체로 제한됩니다. Agent 교체, 셀프 호스팅, BYOK ── 어느 것도 불가능합니다.

🔓 Open Design은 같은 능력을 열어 둡니다: **모델은 자유 선택, 키는 본인 보관, Skill과 디자인 시스템은 편집 가능한 로컬 파일** ── 시스템 전체가 본인의 기기에서 실행됩니다.

🤝 우리는 새로운 Agent를 만들 생각이 없습니다. 이미 노트북에 있는 Claude Code, Codex, Cursor Agent로 충분합니다. **OD가 하는 일은, 그것들을 완전한 디자인 워크플로에 연결하는 것뿐입니다.**

## 🆚 Difference from other solutions

| | Claude Design | Figma | Lovable / v0 / Bolt | **Open Design** |
|---|---|---|---|---|
| **오픈소스** | ❌ | ❌ | ❌ | ✅ Apache-2.0 |
| **로컬 실행** | ❌ 클라우드만 | ❌ 클라우드 종속 | ❌ 클라우드만 | ✅ daemon + 데스크톱 앱 |
| **Agent** | Anthropic 고정 | Make 모드 자체 고정 | 자체 모델 고정 | ✅ 16개 CLI 중 선택 |
| **BYOK** | ❌ | ❌ | 일부 | ✅ Anthropic / OpenAI / Azure / Google |
| **브랜드 디자인 시스템** | 내장·교체 불가 | 팀 라이브러리(사설) | 테마 JSON | ✅ 129개 Markdown 시스템, 자유 커스터마이즈 |
| **Skill 확장** | 클로즈드 | 플러그인 마켓(심사) | 클로즈드 | ✅ 폴더 드롭으로 즉시 적용 |
| **시나리오** | 일반 디자인 | UI / 프로토타입 / 협업 | 코드 지향 프로토 | ✅ 디자인 / 마케팅 / 운영 / 프로덕트 / 재무 / HR |

## 🖼️ Demo

네 가지 핵심 산출물:

### 📐 프로토타입 (Prototype)

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/gamified-app.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><code>gamified-app</code></a> · 게임화 모바일 프로토 ── 다크 스테이지 3프레임 + XP 바 + 퀘스트 카드</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/social-carousel.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><code>social-carousel</code></a> · 소셜 3장 캐러셀 ── 1080×1080, 헤드라인이 연결되어 순환</sub></td>
</tr>
</table>

### 🎞️ Slide

<table>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/kami-deck.png" width="380"/><br/><sub><b>Kami Deck</b> ──「Designing intelligence on warm paper」매거진 스타일 표지</sub></td>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/open-design-landing-deck.png" width="380"/><br/><sub><b>Open Design Landing Deck</b> ── 랜딩 페이지 스타일 프레젠테이션</sub></td>
</tr>
</table>

### 🖼️ 이미지

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/3d-stone-staircase-evolution-infographic.json"><img src="https://cms-assets.youmind.com/media/1776661968404_8a5flm_HGQc_KOaMAA2vt0.jpg" width="380"/></a><br/><sub><b>3D Stone Staircase Evolution Infographic</b> ── 석조 질감의 3단 인포그래픽</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/profile-avatar-glamorous-woman-in-black-portrait.json"><img src="https://cms-assets.youmind.com/media/1777453184257_vb9hvl_HG9tAkOa4AAuRrn.jpg" width="380"/></a><br/><sub><b>Glamorous Woman in Black Portrait</b> ── 에디토리얼 스튜디오 포트레이트</sub></td>
</tr>
</table>

### 🎬 비디오

<table>
<tr>
<td width="50%"><a href="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/downloads/default.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Luxury Supercar Cinematic</b> ── 내러티브 프로덕트 필름, 클릭하여 MP4 재생</sub></td>
<td width="50%"><a href="https://github.com/YouMind-OpenLab/awesome-seedance-2-prompts/releases/download/videos/1402.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7f63ad253175a9ad1dac53de490efac8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Japanese Romance Short Film</b> ── 15초 Seedance 2.0 내러티브</sub></td>
</tr>
</table>

## 🎯 Use cases

### 🎨 디자이너

**현재 워크플로**: Figma에서 프레임 단위로 작업, 브랜드 가이드와 반복 정렬, 결과물을 엔지니어에 인계. 변경 시 여러 파일을 수동 동기화.

**페인 포인트**: 초안 시간이 길고, 브랜드 교체는 컴포넌트별 수동 작업, 디자인과 엔지니어링이 진실의 단일 출처를 공유하지 못함.

**OpenDesign**: 프롬프트로 구조를 설명하는 대신 캔버스 위 스케치로 지시 ── Agent가 거기서 코드 수준 프로토타입을 생성. Design System 전환 시 컬러·타이포·간격이 자동 적용. 듀얼 트랙 코멘트로 「내 메모」와 「Agent에 보낼 지시」를 분리. 최종 HTML이 디자인이자 엔지니어링 결과물입니다.

---

### 📋 PM (프로덕트 매니저)

**현재 워크플로**: Notion에서 PRD → Figma에서 와이어프레임 → Keynote에서 보고용 덱 → 세 문서를 수동 정합.

**페인 포인트**: 세 도구를 오가며 영원히 동기화되지 않음, "움직이는 데모"를 보여주려면 개발 일정을 기다려야 함.

**OpenDesign**: 자연어로 PM Spec 문서(TOC + 의사결정 로그 포함)를 바로 생성; 매거진 스타일 Slides로 한 문장에서 시드 라운드 피치덱 작성; Live Artifact가 Notion / Linear의 실제 데이터를 가져와 5분 만에 동작하는 프로덕트 데모 완성.

---

### 💻 엔지니어

**현재 워크플로**: v0 / Bolt로 프로토 시작 ── 그러나 모델과 키가 클라우드에 잠겨 있고, 팀의 Skill을 fork할 수도 없음.

**페인 포인트**: 데이터 경계 외부 유출, 토큰 소비 통제 불가, 확장은 플랫폼 게이트, 디자인 → 코드 인계는 인간이 번역.

**OpenDesign**: BYOK으로 자체 LLM 게이트웨이 연결, 모든 프로젝트는 로컬 SQLite. Skill은 `SKILL.md` + `assets/` 폴더 ── `skills/`에 넣으면 끝. Handoff to Coding Agent로 디자인을 그대로 Cursor / Claude Code에 인계, 컨텍스트가 사라지지 않습니다.

---

### 📣 마케팅 & 운영

**현재 워크플로**: 캠페인마다 디자인 일정이 필요. 플랫폼별 사이즈(인스타 / 카카오 / TikTok)는 수동 크롭.

**페인 포인트**: 디자인 대기, 카피 / 컬러 변경마다 재작업, 주 50장은 인력으로 감당 불가.

**OpenDesign**: 한 프롬프트로 6장 병렬 소셜 카드(인스타 커버 / 카카오 헤더 / TikTok 세로) 생성; 주간 보고서 / OKR / 칸반은 Live Artifact로 Notion / Linear / Slack에 직접 연결 ── 한 번 게시하면 자동 새로고침.

## 🚀 Getting started

세 가지 방식, 상황에 맞게 선택:

### 1️⃣ 데스크톱 앱 다운로드 (가장 빠름, 무설정)

가장 간단한 시작 ── 설치 후 바로 사용, `PATH` 위의 Coding Agent를 자동 감지. 프로젝트는 로컬 SQLite에 저장.

- 데스크톱 빌드(macOS Apple Silicon · Windows x64): [open-design.ai](https://open-design.ai/)
- 이전 릴리스: [GitHub Releases](https://github.com/nexu-io/open-design/releases)

추천 대상: 개인 사용자, 디자이너, PM ── 클릭만 하고 바로 작업하려는 사람.

### 2️⃣ 원클릭 클라우드 배포 (팀 공유)

Web 레이어를 Vercel에 배포, 팀이 함께 사용, BYOK 자격 증명은 환경 변수로. daemon은 여전히 로컬이나 자체 서버에서 실행 ── 프론트/백 분리.

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/nexu-io/open-design"><img alt="Deploy to Vercel" src="https://img.shields.io/badge/Deploy_to-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  <a href="https://railway.app/new/template?template=https://github.com/nexu-io/open-design"><img alt="Deploy to Railway" src="https://img.shields.io/badge/Deploy_to-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" /></a>
  <a href="../deploy.md"><img alt="Self-host with Docker" src="https://img.shields.io/badge/Self--host-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" /></a>
</p>

전체 배포 가이드: [`docs/deploy.md`](../deploy.md)

추천 대상: 소규모 팀, 스타트업 ── 자산 라이브러리 + 디자인 시스템을 공유하되 인프라 운영은 피하고 싶은 경우.

### 3️⃣ 소스 직접 배포 (완전 제어)

리포지토리를 clone해 풀스택(daemon + Web + 선택적 Electron 셸)을 본인 머신에서 실행:

```bash
git clone https://github.com/nexu-io/open-design
cd open-design
pnpm install
pnpm tools-dev start
# → http://localhost:3000
```

전체 Quickstart: [`QUICKSTART.md`](../../QUICKSTART.md) · 아키텍처 및 옵션: [`docs/architecture.md`](../architecture.md)

추천 대상: 개발자, 엔터프라이즈 셀프 호스팅 ── 코드 fork, 커스텀 Skill 추가, 내부 LLM 게이트웨이 연결이 필요한 경우.

---

**상세 문서**

| | |
|---|---|
| 📐 [Architecture](../architecture.md) | daemon · 프로토콜 파싱 · BYOK 프록시 |
| 🧠 [Philosophy](../philosophy.md) | Junior-Designer 모드 · 5축 자기 비평 · anti-AI-slop |
| 🤖 [Agents](../agents.md) | 16 CLI 상세 |
| 🎨 [Design Systems](../design-systems.md) | 129개 내장 시스템 |
| 🛠️ [Skills](../../skills/) | 31개 Skill 카탈로그 |

## 🗺️ Roadmap

### ✅ 출시 완료

- **🏠 Home** — 자산 라이브러리(My Design / Templates / Brand Systems)
- **🎨 Studio** — 4가지 진입점(Prototype / Slides / Media / Import), Chat + 파일 관리 + Sketch + 샌드박스 Preview, Editor의 Tweaks · Comment · Present, HTML/PDF/PPT/ZIP/MD 내보내기
- **⚙️ Setting** — Execute Mode(Harness / BYOK), 14개 Media Provider, Composio Connector, 내장 Skill + MCP, 개인화

### 🟡 진행 중

- **🎨 Studio** — Live Artifact (Beta), Editor의 Edit · Draw · Voice editing
- **⚙️ Setting** — Memory(개인 메모리, 프로젝트 간 재사용), Coding Plan

### 🚧 계획 중

- **🎨 Studio** — Handoff to Coding Agent (디자인 → 코드 마지막 1km)
- **👭 Organization** — Workspace, 팀 레벨 Skill & Memory, 프로젝트 레벨 4단 권한 (View / Comment / Edit / Private)

> 우선순위 피드백이 있나요? [Issues](https://github.com/nexu-io/open-design/issues) 또는 [Discord](https://discord.gg/qhbcCH8Am4)에서 알려주세요.

## 🤝 Contributing

모든 형태의 기여를 환영합니다 ── 새 Skill, 새 Design System, 버그 수정, 번역.

- Fork & PR 흐름: [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Skill 추가: [`skills/`](../../skills/)에 폴더를 넣고 daemon 재시작 ── [`docs/skills-protocol.md`](../skills-protocol.md) 참고
- Design System 추가: `DESIGN.md`를 작성해 [`design-systems/`](../../design-systems/)에 넣기
- 버그 / 기능 요청: [GitHub Issues](https://github.com/nexu-io/open-design/issues)

## 💬 Community

- 💭 [Discord](https://discord.gg/qhbcCH8Am4) ── 일상 토론, Skill 공유, 도움 요청
- 🐦 [@nexudotio](https://x.com/nexudotio) ── 프로덕트 업데이트
- 🌟 Open Design이 마음에 드신다면 Star를 ── 큰 힘이 됩니다.

## 👥 Contributors

Open Design을 앞으로 나아가게 해주신 모든 분께 감사드립니다 ── 코드, 문서, Skill, Design System 또는 날카로운 Issue를 통해. 아래 벽이 가장 직접적인 「감사합니다」입니다.

<a href="https://github.com/nexu-io/open-design/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nexu-io/open-design&max=500&columns=18&anon=0&cache_bust=2026-05-08" alt="Open Design contributors" />
</a>

<br/>

처음 PR을 보내시나요? 환영합니다. [`good-first-issue` / `help-wanted`](https://github.com/nexu-io/open-design/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2C%22help+wanted%22) 라벨이 입구입니다.


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

Open Design은 오픈소스 릴레이의 한 구간입니다. 다음 작자들의 선행 작업이 OD의 토대를 직접 형성합니다:

<table>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://www.anthropic.com/"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://www.anthropic.com/"><b>Anthropic</b></a><br/>
  <sub><a href="https://www.anthropic.com/news/claude-design">Claude Design</a></sub><br/>
  <sub>본 리포지토리가 오픈소스 대안을 제공하는 클로즈드 제품 ── artifact-first 사고의 개척자.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/alchaincyf"><img src="https://github.com/alchaincyf.png" width="64" height="64" style="border-radius:50%" alt="alchaincyf" /></a><br/>
  <a href="https://github.com/alchaincyf"><b>@alchaincyf</b> (Hua Shu)</a><br/>
  <sub><a href="https://github.com/alchaincyf/huashu-design"><code>huashu-design</code></a></sub><br/>
  <sub>디자인 철학의 핵심 ── Junior-Designer 워크플로, 5단계 브랜드 자산 프로토콜, anti-AI-slop 체크리스트, 5축 자기 비평.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/op7418"><img src="https://github.com/op7418.png" width="64" height="64" style="border-radius:50%" alt="op7418" /></a><br/>
  <a href="https://github.com/op7418"><b>@op7418</b> (Guizang)</a><br/>
  <sub><a href="https://github.com/op7418/guizang-ppt-skill"><code>guizang-ppt-skill</code></a></sub><br/>
  <sub>Magazine-web-PPT skill 그대로 번들, Deck 모드의 기본 구현, P0/P1/P2 체크리스트 문화의 출처.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/multica-ai"><img src="https://github.com/multica-ai.png" width="64" height="64" style="border-radius:50%" alt="multica-ai" /></a><br/>
  <a href="https://github.com/multica-ai"><b>@multica-ai</b></a><br/>
  <sub><a href="https://github.com/multica-ai/multica"><code>multica</code></a></sub><br/>
  <sub>Daemon + adapter 아키텍처, PATH 스캔식 agent 감지, agent-as-teammate 세계관.</sub>
</td>
</tr>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/OpenCoworkAI"><img src="https://github.com/OpenCoworkAI.png" width="64" height="64" style="border-radius:50%" alt="OpenCoworkAI" /></a><br/>
  <a href="https://github.com/OpenCoworkAI"><b>@OpenCoworkAI</b></a><br/>
  <sub><a href="https://github.com/OpenCoworkAI/open-codesign"><code>open-codesign</code></a></sub><br/>
  <sub>최초의 오픈소스 Claude Design 대안 ── streaming-artifact 루프, 샌드박스 iframe 미리보기, 실시간 agent 패널.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/VoltAgent"><img src="https://github.com/VoltAgent.png" width="64" height="64" style="border-radius:50%" alt="VoltAgent" /></a><br/>
  <a href="https://github.com/VoltAgent"><b>@VoltAgent</b></a><br/>
  <sub><a href="https://github.com/VoltAgent/awesome-design-md"><code>awesome-design-md</code></a></sub><br/>
  <sub>9섹션 <code>DESIGN.md</code> 스키마의 출처, 69개 프로덕트 시스템의 임포트 경로.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/farion1231"><img src="https://github.com/farion1231.png" width="64" height="64" style="border-radius:50%" alt="farion1231" /></a><br/>
  <a href="https://github.com/farion1231"><b>@farion1231</b></a><br/>
  <sub><a href="https://github.com/farion1231/cc-switch"><code>cc-switch</code></a></sub><br/>
  <sub>여러 agent CLI에 걸친 symlink 식 skill 배포의 영감과 참조 구현.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/anthropics"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://github.com/anthropics"><b>@anthropics</b></a><br/>
  <sub><a href="https://docs.anthropic.com/en/docs/claude-code/skills">Claude Code Skills</a></sub><br/>
  <sub><code>SKILL.md</code> 규약을 그대로 채택 ── Claude Code의 skill을 <code>skills/</code>에 넣으면 동작.</sub>
</td>
</tr>
</table>

모든 아이디어, 빌려온 모든 코드 라인 뒤에는 실재하는 작자가 있습니다. Open Design이 마음에 드신다면, 그분들에게도 Star를 ⭐

## 📄 License

[Apache-2.0](../../LICENSE)

Anthropic, OpenAI, Google이 가장 진보된 AI 디자인 능력을 페이월 뒤에 가둘 때, 세상은 또 다른 목소리가 필요합니다 ── **첨단 기술을 모든 개발자, 디자이너, 창작자의 책상으로 되돌려 놓는 것**.

언젠가 독립 디자이너가 더 이상 구독료를 걱정하지 않고, 아직 학교에 다니는 청년이 일류 도구를 사용해 인생 첫 자랑할 만한 작품을 만들어낼 수 있기를 바랍니다.

> **Take it. Build with it. Make it yours.**

[cd]: https://www.anthropic.com/news/claude-design
