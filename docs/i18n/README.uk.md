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
  <a href="README.pt-BR.md">Português</a> · <a href="README.ru.md">Русский</a> ·
  <a href="README.ar.md">العربية</a> · <a href="README.tr.md">Türkçe</a> ·
  <b>Українська</b>
</p>

<br/>

> **Open-source альтернатива до [Claude Design][cd].** Local-first, запускає **16 Coding Agents**, серед яких OpenClaw, Claude Code, Hermes Agent ── одразу на вашій машині.
>
> **129 брендових дизайн-систем** ── Linear / Stripe / Apple / Notion, перемикайтеся одним кліком.
>
> **31 Skill** ── Prototype / Live Artifact / Slides / зображення / відео / аудіо, повне покриття.

---

## 📋 What

✨ **Open Design (OD) — open-source альтернатива [Claude Design][cd], workspace, який перетворює природну мову на готові до видачі дизайн-артефакти.**

📝 Опишіть дизайн одним реченням, і OD створить готові до здачі прототипи, Live Artifacts, Slides, зображення, відео й аудіо ── 🎨 на рівні досвідченого дизайнера, без одноманітності типових AI-виводів.

📤 Експорт у HTML, PDF, PPT, ZIP, Markdown та інші формати.

🤖 Працює на **Coding Agents** (Claude Code / Codex / Cursor Agent / OpenClaw — на ваш вибір). 📂 Кожен Skill і Design System — звичайний Markdown-файл у проєкті ── читайте, редагуйте, форкайте, діліться.

💻 **Local-first.** Усі дані та runtime живуть повністю на вашій машині.

## 💡 Why

🚀 У квітні 2026 Anthropic випустила [Claude Design][cd] і **вперше показала, що LLM справді може робити дизайн** ── не писати есе *про* дизайн, а **видавати справжній, придатний до використання артефакт дизайну**.

🔒 Але він залишився **закритим, платним, лише в хмарі**, та прив'язаним до моделей Anthropic. Замінити агента, розгорнути в себе, BYOK ── нічого з цього було неможливо.

🔓 Open Design відкриває ту саму спроможність: **обирайте модель, тримайте ключі, редагуйте кожен Skill і Design System як локальний файл** ── уся система працює на вашому залізі.

🤝 Ми не будуємо ще одного Agent. Уже встановлених у вас Claude Code, Codex та Cursor Agent достатньо. **OD просто з'єднує їх у повний дизайн-workflow.**

## 🆚 Difference from other solutions

| | Claude Design | Figma | Lovable / v0 / Bolt | **Open Design** |
|---|---|---|---|---|
| **Open source** | ❌ | ❌ | ❌ | ✅ Apache-2.0 |
| **Local-first** | ❌ Лише хмара | ❌ Прив'язка до хмари | ❌ Лише хмара | ✅ Daemon + десктоп-застосунок |
| **Agent** | Лише Anthropic | Make-mode зачинений | Vendor-locked | ✅ 16 CLI на вибір |
| **BYOK** | ❌ | ❌ | Частково | ✅ Anthropic / OpenAI / Azure / Google |
| **Брендові системи** | Вбудовані, фіксовані | Командні бібліотеки (приватні) | Theme JSON | ✅ 129 Markdown-систем, повністю налаштовуваних |
| **Розширення Skill** | Закрите | Маркетплейс плагінів (з фільтром) | Закрите | ✅ Киньте теку — готово |
| **Сценарії** | Загальний дизайн | UI / прототип / колаб | Прототипи під код | ✅ Дизайн / маркетинг / ops / продукт / фінанси / HR |

## 🖼️ Demo

Чотири основні типи артефактів:

### 📐 Prototype

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/gamified-app.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><code>gamified-app</code></a> · Геймифікований мобільний прототип ── темна сцена з трьох кадрів + XP-смуги + картки квестів</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/social-carousel.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><code>social-carousel</code></a> · Соціальна каруселька ── три картки 1080×1080, заголовки пов'язані</sub></td>
</tr>
</table>

### 🎞️ Slide

<table>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/kami-deck.png" width="380"/><br/><sub><b>Kami Deck</b> ── «Designing intelligence on warm paper», обкладинка в журнальному стилі</sub></td>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/open-design-landing-deck.png" width="380"/><br/><sub><b>Open Design Landing Deck</b> ── презентація у стилі landing-page</sub></td>
</tr>
</table>

### 🖼️ Зображення

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/3d-stone-staircase-evolution-infographic.json"><img src="https://cms-assets.youmind.com/media/1776661968404_8a5flm_HGQc_KOaMAA2vt0.jpg" width="380"/></a><br/><sub><b>3D Stone Staircase Evolution Infographic</b> ── триступенева інфографіка в естетиці висіченого каменю</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/profile-avatar-glamorous-woman-in-black-portrait.json"><img src="https://cms-assets.youmind.com/media/1777453184257_vb9hvl_HG9tAkOa4AAuRrn.jpg" width="380"/></a><br/><sub><b>Glamorous Woman in Black Portrait</b> ── редакторський студійний портрет</sub></td>
</tr>
</table>

### 🎬 Відео

<table>
<tr>
<td width="50%"><a href="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/downloads/default.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Luxury Supercar Cinematic</b> ── оповідний продуктовий фільм, клікніть для відтворення MP4</sub></td>
<td width="50%"><a href="https://github.com/YouMind-OpenLab/awesome-seedance-2-prompts/releases/download/videos/1402.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7f63ad253175a9ad1dac53de490efac8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Japanese Romance Short Film</b> ── 15-секундний наратив на Seedance 2.0</sub></td>
</tr>
</table>

## 🎯 Use cases

### 🎨 Дизайнери

**Сьогодні:** Покадрова робота у Figma, багаторазове звіряння з brand-гайдом, потім передача в інженерію. Коли бренд змінюється, кожен файл синхронізують вручну.

**Біль:** Перші чернетки забирають вічність, заміна бренду — це покомпонентне редагування, а дизайн та інженерія ніколи не мають єдиного джерела правди.

**OpenDesign:** Накидайте структуру на полотні замість опису в промпті ── агент генерує прототипи на рівні коду зі скетчу. Перемикання Design System автоматично замінює палітру, типографіку та відступи. Двоканальні коментарі відокремлюють «нотатку для себе» від «інструкції агенту». Фінальний HTML — це і дизайн, і інженерний артефакт.

---

### 📋 Продакт-менеджери

**Сьогодні:** PRD у Notion → wireframe у Figma → deck у Keynote → узгодити три документи вручну.

**Біль:** Три інструменти, постійно розсинхронізовані. Показати керівництву «живе демо» означає чекати на інженерію.

**OpenDesign:** Генерує PM Spec doc (з TOC + журналом рішень) із природної мови; одне речення дає pitch deck у журнальному стилі для seed-раунду; Live Artifact підтягує реальні дані з Notion / Linear, тож робоче демо продукту — за п'ять хвилин замість спринту.

---

### 💻 Інженери

**Сьогодні:** v0 / Bolt для запуску прототипів ── але модель і ключ замкнені у їхній хмарі, і немає способу форкнути Skill команди в приватний репозиторій.

**Біль:** Дані виходять за периметр, витрата токенів непередбачувана, розширення відфільтровані платформою, а handoff дизайн→код — це людський переклад.

**OpenDesign:** BYOK до власного LLM-шлюзу, кожен проєкт у локальному SQLite. Skill — це просто `SKILL.md` + `assets/` ── киньте теку в `skills/`, готово. «Handoff to Coding Agent» передає дизайн у Cursor / Claude Code зі збереженням повного контексту.

---

### 📣 Маркетинг та ops

**Сьогодні:** Кожна кампанія потребує дизайн-bandwidth. Розміри під Instagram / X / TikTok — це ручний кроп під кожну платформу.

**Біль:** Чекати на дизайн, кожна правка тексту/кольору — переробка, і 50 карток на тиждень — більше, ніж витримують люди.

**OpenDesign:** Один промпт видає шість варіантів соц-карток поряд (обкладинка Instagram / шапка X / вертикаль TikTok ── на ваш вибір). Тижневі звіти / OKR / kanban-дашборди живуть на Live Artifact, під'єднаному до Notion / Linear / Slack ── опублікували раз, оновлюється назавжди.

## 🚀 Getting started

Три способи, оберіть свій:

### 1️⃣ Завантажте десктоп-застосунок (найшвидше, без налаштувань)

Найпростіший шлях ── встановіть, відкрийте, і OD автоматично виявить кожен Coding Agent у вашому `PATH`. Проєкти зберігаються локально в SQLite.

- Десктоп-збірки (macOS Apple Silicon · Windows x64): [open-design.ai](https://open-design.ai/)
- Минулі релізи: [GitHub Releases](https://github.com/nexu-io/open-design/releases)

Підходить: індивідуальні користувачі, дизайнери, PM ── ті, хто хоче клацнути й одразу почати.

### 2️⃣ Деплой у хмару (спільний для команди)

Запустіть веб-шар на Vercel, поділіться з командою, передавайте BYOK-credentials через env-змінні. Daemon і далі може працювати локально або на вашому сервері ── чисте розділення фронт/бек.

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/nexu-io/open-design"><img alt="Deploy to Vercel" src="https://img.shields.io/badge/Deploy_to-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  <a href="https://railway.app/new/template?template=https://github.com/nexu-io/open-design"><img alt="Deploy to Railway" src="https://img.shields.io/badge/Deploy_to-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" /></a>
  <a href="../deploy.md"><img alt="Self-host with Docker" src="https://img.shields.io/badge/Self--host-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" /></a>
</p>

Повний посібник з деплою: [`docs/deploy.md`](../deploy.md)

Підходить: малі команди та стартапи, яким потрібна спільна бібліотека ассетів + дизайн-система без обслуговування інфри.

### 3️⃣ Self-host з вихідного коду (повний контроль)

Клонуйте репо й запустіть повний стек ── daemon + web + опційна Electron-оболонка ── на своїй машині:

```bash
git clone https://github.com/nexu-io/open-design
cd open-design
pnpm install
pnpm tools-dev start
# → http://localhost:3000
```

Повний Quickstart: [`QUICKSTART.md`](../../QUICKSTART.md) · Архітектура й опції: [`docs/architecture.md`](../architecture.md)

Підходить: розробники й підприємства, які мають форкати, додавати кастомні Skill або під'єднати внутрішній LLM-шлюз.

---

**Глибша документація**

| | |
|---|---|
| 📐 [Architecture](../architecture.md) | daemon · парсинг протоколу · BYOK proxy |
| 🧠 [Philosophy](../philosophy.md) | режим Junior-Designer · 5-вимірна самокритика · anti-AI-slop |
| 🤖 [Agents](../agents.md) | 16 CLI у деталях |
| 🎨 [Design Systems](../design-systems.md) | 129 систем «з коробки» |
| 🛠️ [Skills](../../skills/) | каталог із 31 Skill |

## 🗺️ Roadmap

### ✅ Випущено

- **🏠 Home** — бібліотека ассетів (My Design / Templates / Brand Systems)
- **🎨 Studio** — чотири точки входу (Prototype / Slides / Media / Import); Chat + керування файлами + Sketch + Preview у sandbox; Editor із Tweaks · Comment · Present; експорт HTML/PDF/PPT/ZIP/MD
- **⚙️ Setting** — Execute Mode (Harness / BYOK), 14 Media Provider, Composio Connector, вбудовані Skill + MCP, персоналізація

### 🟡 У роботі

- **🎨 Studio** — Live Artifact (Beta); Edit · Draw · Voice editing у Editor
- **⚙️ Setting** — Memory (особиста пам'ять, перевикористання між проєктами); Coding Plan

### 🚧 Заплановано

- **🎨 Studio** — Handoff to Coding Agent (остання миля дизайн→код)
- **👭 Organization** — Workspace; командні Skill & Memory; 4-рівневі права на проєкт (View / Comment / Edit / Private)

> Маєте фідбек щодо пріоритетів? Розкажіть нам в [Issues](https://github.com/nexu-io/open-design/issues) або [Discord](https://discord.gg/qhbcCH8Am4).

## 🤝 Contributing

Вітаємо будь-який внесок ── нові Skill, нові Design Systems, виправлення багів, переклади.

- Потік Fork & PR: [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Додати Skill: киньте теку в [`skills/`](../../skills/) і перезапустіть daemon ── див. [`docs/skills-protocol.md`](../skills-protocol.md)
- Додати Design System: напишіть `DESIGN.md` і покладіть у [`design-systems/`](../../design-systems/)
- Баги / запити фіч: [GitHub Issues](https://github.com/nexu-io/open-design/issues)

## 💬 Community

- 💭 [Discord](https://discord.gg/qhbcCH8Am4) ── щоденне обговорення, обмін Skill, гілки допомоги
- 🐦 [@nexudotio](https://x.com/nexudotio) ── оновлення продукту
- 🌟 Якщо вам подобається Open Design, поставте Star ── це справді допомагає.

## 👥 Contributors

Дякуємо всім, хто рухає Open Design уперед ── через код, документацію, Skill, Design Systems або влучний Issue. Стіна нижче — найпряміший спосіб сказати *дякую*.

<a href="https://github.com/nexu-io/open-design/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nexu-io/open-design&max=500&columns=18&anon=0&cache_bust=2026-05-08" alt="Open Design contributors" />
</a>

<br/>

Перший PR? Ласкаво просимо. Мітки [`good-first-issue` / `help-wanted`](https://github.com/nexu-io/open-design/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2C%22help+wanted%22) — це точка входу.


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

Open Design — це етап open-source естафети. Він працює завдяки роботі, яку було зроблено раніше ── проєкти цих авторів напряму формують основу OD:

<table>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://www.anthropic.com/"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://www.anthropic.com/"><b>Anthropic</b></a><br/>
  <sub><a href="https://www.anthropic.com/news/claude-design">Claude Design</a></sub><br/>
  <sub>Закритий продукт, до якого це репо пропонує відкриту альтернативу ── джерело ментальної моделі artifact-first.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/alchaincyf"><img src="https://github.com/alchaincyf.png" width="64" height="64" style="border-radius:50%" alt="alchaincyf" /></a><br/>
  <a href="https://github.com/alchaincyf"><b>@alchaincyf</b> (Hua Shu)</a><br/>
  <sub><a href="https://github.com/alchaincyf/huashu-design"><code>huashu-design</code></a></sub><br/>
  <sub>Серце дизайн-філософії ── Junior-Designer workflow, 5-кроковий протокол брендових ассетів, anti-AI-slop checklist, 5-вимірна самокритика.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/op7418"><img src="https://github.com/op7418.png" width="64" height="64" style="border-radius:50%" alt="op7418" /></a><br/>
  <a href="https://github.com/op7418"><b>@op7418</b> (Guizang)</a><br/>
  <sub><a href="https://github.com/op7418/guizang-ppt-skill"><code>guizang-ppt-skill</code></a></sub><br/>
  <sub>Magazine-web-PPT skill у пакеті незмінним, дефолтна реалізація Deck-режиму, джерело культури чек-листів P0/P1/P2.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/multica-ai"><img src="https://github.com/multica-ai.png" width="64" height="64" style="border-radius:50%" alt="multica-ai" /></a><br/>
  <a href="https://github.com/multica-ai"><b>@multica-ai</b></a><br/>
  <sub><a href="https://github.com/multica-ai/multica"><code>multica</code></a></sub><br/>
  <sub>Архітектура daemon + adapter, виявлення agent скануванням PATH, світогляд agent-as-teammate.</sub>
</td>
</tr>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/OpenCoworkAI"><img src="https://github.com/OpenCoworkAI.png" width="64" height="64" style="border-radius:50%" alt="OpenCoworkAI" /></a><br/>
  <a href="https://github.com/OpenCoworkAI"><b>@OpenCoworkAI</b></a><br/>
  <sub><a href="https://github.com/OpenCoworkAI/open-codesign"><code>open-codesign</code></a></sub><br/>
  <sub>Перша open-source альтернатива Claude Design ── streaming-artifact loop, sandboxed iframe preview, лайв agent-панель.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/VoltAgent"><img src="https://github.com/VoltAgent.png" width="64" height="64" style="border-radius:50%" alt="VoltAgent" /></a><br/>
  <a href="https://github.com/VoltAgent"><b>@VoltAgent</b></a><br/>
  <sub><a href="https://github.com/VoltAgent/awesome-design-md"><code>awesome-design-md</code></a></sub><br/>
  <sub>Джерело 9-секційної схеми <code>DESIGN.md</code> та шлях імпорту 69 продуктових систем.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/farion1231"><img src="https://github.com/farion1231.png" width="64" height="64" style="border-radius:50%" alt="farion1231" /></a><br/>
  <a href="https://github.com/farion1231"><b>@farion1231</b></a><br/>
  <sub><a href="https://github.com/farion1231/cc-switch"><code>cc-switch</code></a></sub><br/>
  <sub>Дистрибуція skills через symlink між кількома agent CLI ── натхнення та еталонна реалізація.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/anthropics"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://github.com/anthropics"><b>@anthropics</b></a><br/>
  <sub><a href="https://docs.anthropic.com/en/docs/claude-code/skills">Claude Code Skills</a></sub><br/>
  <sub>Конвенцію <code>SKILL.md</code> прийнято як є ── будь-який Claude Code skill працює, якщо покласти його в <code>skills/</code>.</sub>
</td>
</tr>
</table>

За кожною ідеєю, за кожним запозиченим рядком коду стоїть реальний автор. Якщо вам подобається Open Design, поставте Star і їм також ⭐.

## 📄 License

[Apache-2.0](../../LICENSE)

Коли Anthropic, OpenAI та Google замикають найсучасніші AI-можливості дизайну за платним фільтром, світу все ще потрібен інший голос ── **повернути передову технологію на стіл кожного розробника, дизайнера й творця**.

Ми сподіваємося, що одного дня незалежна дизайнерка не буде хвилюватися про підписки, а підліток, що ще ходить до школи, зможе користуватися інструментами першого класу, аби створити свою першу роботу, якою справді пишатиметься.

> **Take it. Build with it. Make it yours.**

[cd]: https://www.anthropic.com/news/claude-design
