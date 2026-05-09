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
  <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a> ·
  <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> ·
  <a href="README.pt-BR.md">Português</a> · <b>Русский</b> ·
  <a href="README.ar.md">العربية</a> · <a href="README.tr.md">Türkçe</a> ·
  <a href="README.uk.md">Українська</a>
</p>

<br/>

> **Open-source альтернатива [Claude Design][cd].** Local-first, запускает **16 Coding Agents** включая OpenClaw, Claude Code, Hermes Agent — прямо на вашей машине.
>
> **129 брендовых дизайн-систем** ── Linear / Stripe / Apple / Notion, переключение в один клик.
>
> **31 Skill** ── Prototype / Live Artifact / Slides / изображения / видео / аудио, полное покрытие.

---

## 📋 What

✨ **Open Design (OD) — это open-source workspace, превращающий естественный язык в готовые к доставке артефакты дизайна.**

📝 Опишите дизайн одной фразой, и OD создаст готовые к сдаче прототипы, Live Artifacts, Slides, изображения, видео и аудио ── 🎨 на уровне опытного дизайнера, без однообразия типичных AI-выводов.

📤 Экспорт в HTML, PDF, PPT, ZIP, Markdown и другие форматы.

🤖 Управляется **Coding Agents** (Claude Code / Codex / Cursor Agent / OpenClaw — на ваш выбор). 📂 Каждый Skill и Design System — обычный Markdown-файл в проекте ── читайте, редактируйте, форкайте, делитесь.

💻 **Local-first.** Все данные и runtime живут полностью на вашей машине.

## 💡 Why

🚀 В апреле 2026 Anthropic выпустила [Claude Design][cd] и **впервые показала, что LLM действительно может делать дизайн** ── не писать эссе *о* дизайне, а **выдавать настоящий, рабочий артефакт дизайна**.

🔒 Но он остался **закрытым, платным, только в облаке**, и привязанным к моделям Anthropic. Сменить агента, развернуть у себя, BYOK ── ничего из этого было невозможно.

🔓 Open Design открывает ту же возможность: **выбирайте модель, держите ключи, редактируйте каждый Skill и Design System как локальный файл** ── вся система работает на вашем железе.

🤝 Мы не строим ещё одного Agent. Уже установленных у вас Claude Code, Codex и Cursor Agent достаточно. **OD просто соединяет их в полный workflow дизайна.**

## 🆚 Difference from other solutions

| | Claude Design | Figma | Lovable / v0 / Bolt | **Open Design** |
|---|---|---|---|---|
| **Open source** | ❌ | ❌ | ❌ | ✅ Apache-2.0 |
| **Local-first** | ❌ Только облако | ❌ Привязка к облаку | ❌ Только облако | ✅ Daemon + десктоп-приложение |
| **Agent** | Только Anthropic | Make-mode заперт | Vendor-locked | ✅ 16 CLI на выбор |
| **BYOK** | ❌ | ❌ | Частично | ✅ Anthropic / OpenAI / Azure / Google |
| **Брендовые системы** | Встроенные, фиксированные | Командные библиотеки (приватные) | Theme JSON | ✅ 129 Markdown-систем, полностью настраиваемых |
| **Расширение Skill** | Закрытое | Маркетплейс плагинов (с фильтром) | Закрытое | ✅ Бросьте папку, готово |
| **Сценарии** | Общий дизайн | UI / прототип / коллаб | Прототипы под код | ✅ Дизайн / маркетинг / ops / продукт / финансы / HR |

## 🖼️ Demo

Четыре основных типа артефактов:

### 📐 Prototype

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/gamified-app.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><code>gamified-app</code></a> · Геймифицированный мобильный прототип ── тёмная сцена из трёх кадров + XP-полосы + карточки квестов</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/social-carousel.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><code>social-carousel</code></a> · Социальная карусель ── три карточки 1080×1080, заголовки связаны</sub></td>
</tr>
</table>

### 🎞️ Slide

<table>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/kami-deck.png" width="380"/><br/><sub><b>Kami Deck</b> ── «Designing intelligence on warm paper», обложка в журнальном стиле</sub></td>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/open-design-landing-deck.png" width="380"/><br/><sub><b>Open Design Landing Deck</b> ── презентация в стиле landing-page</sub></td>
</tr>
</table>

### 🖼️ Изображение

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/3d-stone-staircase-evolution-infographic.json"><img src="https://cms-assets.youmind.com/media/1776661968404_8a5flm_HGQc_KOaMAA2vt0.jpg" width="380"/></a><br/><sub><b>3D Stone Staircase Evolution Infographic</b> ── трёхступенчатая инфографика в эстетике высеченного камня</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/profile-avatar-glamorous-woman-in-black-portrait.json"><img src="https://cms-assets.youmind.com/media/1777453184257_vb9hvl_HG9tAkOa4AAuRrn.jpg" width="380"/></a><br/><sub><b>Glamorous Woman in Black Portrait</b> ── редакторский студийный портрет</sub></td>
</tr>
</table>

### 🎬 Видео

<table>
<tr>
<td width="50%"><a href="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/downloads/default.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Luxury Supercar Cinematic</b> ── нарративный продуктовый фильм, кликните для воспроизведения MP4</sub></td>
<td width="50%"><a href="https://github.com/YouMind-OpenLab/awesome-seedance-2-prompts/releases/download/videos/1402.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7f63ad253175a9ad1dac53de490efac8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Japanese Romance Short Film</b> ── 15-секундный нарратив на Seedance 2.0</sub></td>
</tr>
</table>

## 🎯 Use cases

### 🎨 Дизайнеры

**Сегодня:** Покадровая работа в Figma, многократная сверка с brand guide и передача в инжиниринг. При смене бренда каждый файл синхронизируется вручную.

**Боль:** Первые черновики занимают вечность, смена бренда — это покомпонентная правка, и дизайн с инжинирингом никогда не делят единый источник истины.

**OpenDesign:** Скетчите структуру на холсте вместо описания в промпте ── агент генерирует прототипы уровня кода из скетча. Переключение Design System автоматически меняет палитру, типографику и отступы. Двухполосные комментарии разделяют «заметка для себя» и «инструкция агенту». Финальный HTML — это и дизайн, и инженерный артефакт.

---

### 📋 Продакт-менеджеры

**Сегодня:** Пишем PRD в Notion → wireframe в Figma → собираем deck в Keynote → согласуем три документа вручную.

**Боль:** Три инструмента, постоянно рассинхронизированы. Показать руководству «живую демку» — значит ждать инжиниринг.

**OpenDesign:** Генерирует PM Spec doc (с TOC + decision log) из естественного языка; одно предложение — и готов pitch deck в журнальном стиле для seed-раунда; Live Artifact подтягивает реальные данные из Notion / Linear, рабочая демка продукта — за пять минут вместо спринта.

---

### 💻 Инженеры

**Сегодня:** v0 / Bolt для запуска прототипов ── но модель и ключ заперты в их облаке, и нет способа форкнуть Skill команды в приватный репозиторий.

**Боль:** Данные уходят за периметр, расход токенов непредсказуем, расширения отфильтрованы платформой, а handoff дизайн→код — это человеческий перевод.

**OpenDesign:** BYOK к собственному LLM-шлюзу, каждый проект на локальном SQLite. Skill — это просто `SKILL.md` + `assets/` ── положите папку в `skills/`, готово. «Handoff to Coding Agent» передаёт дизайн в Cursor / Claude Code с сохранением полного контекста.

---

### 📣 Маркетинг и ops

**Сегодня:** Каждая кампания требует bandwidth дизайна. Размеры под Instagram / X / TikTok — это ручной кроп под каждую платформу.

**Боль:** Ждать дизайн, каждое изменение копи / цвета — переделка, и 50 карточек в неделю — больше, чем могут выдержать люди.

**OpenDesign:** Один промпт выдаёт шесть вариантов соц-карточек подряд (обложка Instagram / шапка X / вертикаль TikTok — на ваш выбор). Еженедельные отчёты / OKR / kanban-дашборды живут в Live Artifact, подключённом к Notion / Linear / Slack ── опубликовали один раз, обновляется навсегда.

## 🚀 Getting started

Три способа, выбирайте подходящий:

### 1️⃣ Скачать десктоп-приложение (быстрее всего, без настройки)

Самый простой путь ── установите, откройте, и OD автоматически обнаружит каждый Coding Agent в вашем `PATH`. Проекты сохраняются локально в SQLite.

- Десктоп-сборки (macOS Apple Silicon · Windows x64): [open-design.ai](https://open-design.ai/)
- Прошлые релизы: [GitHub Releases](https://github.com/nexu-io/open-design/releases)

Подходит: индивидуальные пользователи, дизайнеры, PM ── те, кто хочет кликнуть и начать работать.

### 2️⃣ Деплой в облако (общий для команды)

Запушьте веб-слой в Vercel, поделитесь с командой, передавайте BYOK-credentials через env-переменные. Daemon по-прежнему может работать локально или на вашем сервере ── чистое разделение фронт/бэк.

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/nexu-io/open-design"><img alt="Deploy to Vercel" src="https://img.shields.io/badge/Deploy_to-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  <a href="https://railway.app/new/template?template=https://github.com/nexu-io/open-design"><img alt="Deploy to Railway" src="https://img.shields.io/badge/Deploy_to-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" /></a>
  <a href="../deploy.md"><img alt="Self-host with Docker" src="https://img.shields.io/badge/Self--host-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" /></a>
</p>

Полное руководство по деплою: [`docs/deploy.md`](../deploy.md)

Подходит: малые команды и стартапы, которым нужна общая библиотека ассетов + design system без обслуживания инфраструктуры.

### 3️⃣ Self-host из исходников (полный контроль)

Клонируйте репо и запустите полный стек ── daemon + web + опциональная Electron-оболочка ── на своей машине:

```bash
git clone https://github.com/nexu-io/open-design
cd open-design
pnpm install
pnpm tools-dev start
# → http://localhost:3000
```

Полный Quickstart: [`QUICKSTART.md`](../../QUICKSTART.md) · Архитектура и опции: [`docs/architecture.md`](../architecture.md)

Подходит: разработчики и предприятия, которым нужно форкнуть, добавить кастомные Skill или подключить внутренний LLM-шлюз.

---

**Углублённая документация**

| | |
|---|---|
| 📐 [Architecture](../architecture.md) | daemon · парсинг протокола · BYOK прокси |
| 🧠 [Philosophy](../philosophy.md) | режим Junior-Designer · 5-мерная самокритика · anti-AI-slop |
| 🤖 [Agents](../agents.md) | 16 CLI в деталях |
| 🎨 [Design Systems](../design-systems.md) | 129 встроенных систем |
| 🛠️ [Skills](../../skills/) | каталог из 31 Skill |

## 🗺️ Roadmap

### ✅ Выпущено

- **🏠 Home** — библиотека ассетов (My Design / Templates / Brand Systems)
- **🎨 Studio** — четыре точки входа (Prototype / Slides / Media / Import); Chat + управление файлами + Sketch + Preview в sandbox; Editor с Tweaks · Comment · Present; экспорт HTML/PDF/PPT/ZIP/MD
- **⚙️ Setting** — Execute Mode (Harness / BYOK), 14 Media Provider, Composio Connector, встроенные Skill + MCP, персонализация

### 🟡 В работе

- **🎨 Studio** — Live Artifact (Beta); Edit · Draw · Voice editing в Editor
- **⚙️ Setting** — Memory (личная память, переиспользование между проектами); Coding Plan

### 🚧 Планируется

- **🎨 Studio** — Handoff to Coding Agent (последняя миля дизайн→код)
- **👭 Organization** — Workspace; командные Skill & Memory; 4-уровневые права на проект (View / Comment / Edit / Private)

> Есть фидбэк по приоритетам? Расскажите нам в [Issues](https://github.com/nexu-io/open-design/issues) или [Discord](https://discord.gg/qhbcCH8Am4).

## 🤝 Contributing

Мы приветствуем любые формы вклада ── новые Skill, новые Design Systems, исправление багов, переводы.

- Поток Fork & PR: [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Добавить Skill: положите папку в [`skills/`](../../skills/) и перезапустите daemon ── см. [`docs/skills-protocol.md`](../skills-protocol.md)
- Добавить Design System: напишите `DESIGN.md` и положите в [`design-systems/`](../../design-systems/)
- Баги / запросы фич: [GitHub Issues](https://github.com/nexu-io/open-design/issues)

## 💬 Community

- 💭 [Discord](https://discord.gg/qhbcCH8Am4) ── ежедневное обсуждение, обмен Skill, помощь
- 🐦 [@nexudotio](https://x.com/nexudotio) ── обновления продукта
- 🌟 Если Open Design нравится, поставьте Star ── это очень помогает.

## 👥 Contributors

Спасибо всем, кто двигает Open Design вперёд ── через код, документацию, Skill, Design Systems или острый Issue. Стена ниже — самый прямой способ сказать *спасибо*.

<a href="https://github.com/nexu-io/open-design/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nexu-io/open-design&max=500&columns=18&anon=0&cache_bust=2026-05-08" alt="Open Design contributors" />
</a>

<br/>

Первый PR? Добро пожаловать. Метки [`good-first-issue` / `help-wanted`](https://github.com/nexu-io/open-design/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2C%22help+wanted%22) — это точка входа.

## ⭐ Star History

<a href="https://star-history.com/#nexu-io/open-design&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date" width="640" />
  </picture>
</a>

## 🙏 Built on

Open Design — это один из этапов open-source эстафеты. Он работает благодаря работе, проделанной до нас ── проекты этих авторов напрямую формируют фундамент OD:

<table>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://www.anthropic.com/"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://www.anthropic.com/"><b>Anthropic</b></a><br/>
  <sub><a href="https://www.anthropic.com/news/claude-design">Claude Design</a></sub><br/>
  <sub>Закрытый продукт, для которого этот репозиторий предлагает открытую альтернативу ── источник ментальной модели artifact-first.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/alchaincyf"><img src="https://github.com/alchaincyf.png" width="64" height="64" style="border-radius:50%" alt="alchaincyf" /></a><br/>
  <a href="https://github.com/alchaincyf"><b>@alchaincyf</b> (Hua Shu)</a><br/>
  <sub><a href="https://github.com/alchaincyf/huashu-design"><code>huashu-design</code></a></sub><br/>
  <sub>Ядро философии дизайна ── Junior-Designer workflow, 5-шаговый протокол брендовых ассетов, anti-AI-slop checklist, 5-мерная самокритика.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/op7418"><img src="https://github.com/op7418.png" width="64" height="64" style="border-radius:50%" alt="op7418" /></a><br/>
  <a href="https://github.com/op7418"><b>@op7418</b> (Guizang)</a><br/>
  <sub><a href="https://github.com/op7418/guizang-ppt-skill"><code>guizang-ppt-skill</code></a></sub><br/>
  <sub>Magazine-web-PPT skill в комплекте без изменений, дефолтная реализация Deck-режима, источник культуры P0/P1/P2 чек-листов.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/multica-ai"><img src="https://github.com/multica-ai.png" width="64" height="64" style="border-radius:50%" alt="multica-ai" /></a><br/>
  <a href="https://github.com/multica-ai"><b>@multica-ai</b></a><br/>
  <sub><a href="https://github.com/multica-ai/multica"><code>multica</code></a></sub><br/>
  <sub>Архитектура daemon + adapter, обнаружение агента сканированием PATH, мировоззрение agent-as-teammate.</sub>
</td>
</tr>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/OpenCoworkAI"><img src="https://github.com/OpenCoworkAI.png" width="64" height="64" style="border-radius:50%" alt="OpenCoworkAI" /></a><br/>
  <a href="https://github.com/OpenCoworkAI"><b>@OpenCoworkAI</b></a><br/>
  <sub><a href="https://github.com/OpenCoworkAI/open-codesign"><code>open-codesign</code></a></sub><br/>
  <sub>Первая open-source альтернатива Claude Design ── streaming-artifact-петля, sandboxed iframe preview, live agent панель.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/VoltAgent"><img src="https://github.com/VoltAgent.png" width="64" height="64" style="border-radius:50%" alt="VoltAgent" /></a><br/>
  <a href="https://github.com/VoltAgent"><b>@VoltAgent</b></a><br/>
  <sub><a href="https://github.com/VoltAgent/awesome-design-md"><code>awesome-design-md</code></a></sub><br/>
  <sub>Источник 9-секционной <code>DESIGN.md</code> схемы и путь импорта 69 продуктовых систем.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/farion1231"><img src="https://github.com/farion1231.png" width="64" height="64" style="border-radius:50%" alt="farion1231" /></a><br/>
  <a href="https://github.com/farion1231"><b>@farion1231</b></a><br/>
  <sub><a href="https://github.com/farion1231/cc-switch"><code>cc-switch</code></a></sub><br/>
  <sub>Дистрибуция skills через symlink между несколькими agent CLI ── вдохновение и эталонная реализация.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/anthropics"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://github.com/anthropics"><b>@anthropics</b></a><br/>
  <sub><a href="https://docs.anthropic.com/en/docs/claude-code/skills">Claude Code Skills</a></sub><br/>
  <sub>Конвенция <code>SKILL.md</code> принята как есть ── любой Claude Code skill работает, если его положить в <code>skills/</code>.</sub>
</td>
</tr>
</table>

За каждой идеей, за каждой заимствованной строкой кода стоит реальный автор. Если вам нравится Open Design, поставьте Star и им тоже ⭐.

## 📄 License

[Apache-2.0](../../LICENSE)

Когда Anthropic, OpenAI и Google запирают самые продвинутые AI-возможности дизайна за платным фильтром, миру всё ещё нужен другой голос ── **вернуть передовые технологии на стол каждого разработчика, дизайнера и автора**.

Мы надеемся, что однажды независимый дизайнер не будет беспокоиться о подписках, а ученик, ещё в школе, сможет использовать инструменты первой линии, чтобы сделать первое произведение, которым он действительно сможет гордиться.

> **Take it. Build with it. Make it yours.**

[cd]: https://www.anthropic.com/news/claude-design
