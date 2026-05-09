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
  <b>Deutsch</b> · <a href="README.fr.md">Français</a> ·
  <a href="README.pt-BR.md">Português</a> · <a href="README.ru.md">Русский</a> ·
  <a href="README.ar.md">العربية</a> · <a href="README.tr.md">Türkçe</a> ·
  <a href="README.uk.md">Українська</a>
</p>

<br/>

> **Die Open-Source-Alternative zu [Claude Design][cd].** Local-first, führt **16 Coding Agents** wie OpenClaw, Claude Code, Hermes Agent direkt auf deinem Rechner aus.
>
> **129 brand-grade Design Systems** ── Linear / Stripe / Apple / Notion, mit einem Klick wechselbar.
>
> **31 Skills** ── Prototype / Live Artifact / Slides / Bild / Video / Audio, alles abgedeckt.

---

## 📋 What

✨ **Open Design (OD) ist die Open-Source-Alternative zu [Claude Design][cd] — ein Open-Source-Workspace, der natürliche Sprache in lieferfertige Design-Artefakte verwandelt.**

📝 Beschreibe dein Design in einem Satz, und OD produziert lieferfertige Prototypen, Live Artifacts, Slides, Bilder, Videos und Audio ── 🎨 mit dem Handwerk eines erfahrenen Designers, nicht der Eintönigkeit generischer KI-Outputs.

📤 Export in HTML, PDF, PPT, ZIP, Markdown und mehr.

🤖 Angetrieben von **Coding Agents** (Claude Code / Codex / Cursor Agent / OpenClaw — deine Wahl). 📂 Jeder Skill und jedes Design System ist eine schlichte Markdown-Datei in deinem Projekt ── lies, bearbeite, forke, teile.

💻 **Local-first.** Alle Daten und Laufzeiten leben vollständig auf deiner eigenen Maschine.

## 💡 Why

🚀 Im April 2026 veröffentlichte Anthropic [Claude Design][cd] und zeigte **zum ersten Mal, dass ein LLM tatsächlich Design machen kann** ── nicht Aufsätze *über* Design schreiben, sondern **ein echtes, brauchbares Design-Artefakt liefern**.

🔒 Aber es blieb **closed source, kostenpflichtig, nur in der Cloud**, und an Anthropics Modelle gebunden. Den Agent austauschen, selbst hosten, BYOK ── nichts davon war möglich.

🔓 Open Design öffnet dieselbe Fähigkeit: **Wähle das Modell, behalte die Schlüssel, bearbeite jeden Skill und jedes Design System als lokale Datei** ── das gesamte System läuft auf deiner eigenen Hardware.

🤝 Wir bauen keinen weiteren Agent. Die Claude Code-, Codex- und Cursor Agent-Versionen, die bereits auf deinem Laptop sind, reichen aus. **Was OD tut, ist sie in einen vollständigen Design-Workflow zu verdrahten.**

## 🆚 Difference from other solutions

| | Claude Design | Figma | Lovable / v0 / Bolt | **Open Design** |
|---|---|---|---|---|
| **Open Source** | ❌ | ❌ | ❌ | ✅ Apache-2.0 |
| **Local-first** | ❌ Nur Cloud | ❌ Cloud-gebunden | ❌ Nur Cloud | ✅ Daemon + Desktop-App |
| **Agent** | Nur Anthropic | Make-Modus gesperrt | Vendor-gesperrt | ✅ 16 CLIs, deine Wahl |
| **BYOK** | ❌ | ❌ | Teilweise | ✅ Anthropic / OpenAI / Azure / Google |
| **Marken-Systeme** | Eingebaut, fix | Team-Bibliotheken (privat) | Theme JSON | ✅ 129 Markdown-Systeme, voll anpassbar |
| **Skill-Erweiterung** | Closed Source | Plugin-Marktplatz (kuratiert) | Closed Source | ✅ Ordner ablegen, fertig |
| **Szenarien** | Allgemeines Design | UI / Prototyp / Collab | Code-orientierte Prototypen | ✅ Design / Marketing / Ops / Produkt / Finanzen / HR |

## 🖼️ Demo

Vier zentrale Artefakttypen:

### 📐 Prototype

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/gamified-app.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><code>gamified-app</code></a> · Gamifizierter Mobile-Prototyp ── drei dunkle Frames + XP-Balken + Quest-Karten</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/social-carousel.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><code>social-carousel</code></a> · Social-Karussell ── drei 1080×1080-Karten, verbundene Headlines</sub></td>
</tr>
</table>

### 🎞️ Slide

<table>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/kami-deck.png" width="380"/><br/><sub><b>Kami Deck</b> ── „Designing intelligence on warm paper", Magazin-Cover</sub></td>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/open-design-landing-deck.png" width="380"/><br/><sub><b>Open Design Landing Deck</b> ── Präsentation im Landing-Page-Stil</sub></td>
</tr>
</table>

### 🖼️ Bild

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/3d-stone-staircase-evolution-infographic.json"><img src="https://cms-assets.youmind.com/media/1776661968404_8a5flm_HGQc_KOaMAA2vt0.jpg" width="380"/></a><br/><sub><b>3D Stone Staircase Evolution Infographic</b> ── dreistufige Infografik in Stein-Optik</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/profile-avatar-glamorous-woman-in-black-portrait.json"><img src="https://cms-assets.youmind.com/media/1777453184257_vb9hvl_HG9tAkOa4AAuRrn.jpg" width="380"/></a><br/><sub><b>Glamorous Woman in Black Portrait</b> ── editoriales Studio-Porträt</sub></td>
</tr>
</table>

### 🎬 Video

<table>
<tr>
<td width="50%"><a href="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/downloads/default.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Luxury Supercar Cinematic</b> ── narrativer Produkt-Film, Klick zum Abspielen des MP4</sub></td>
<td width="50%"><a href="https://github.com/YouMind-OpenLab/awesome-seedance-2-prompts/releases/download/videos/1402.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7f63ad253175a9ad1dac53de490efac8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Japanese Romance Short Film</b> ── 15s Seedance 2.0 Erzählung</sub></td>
</tr>
</table>

## 🎯 Use cases

### 🎨 Designer

**Heute:** Frame-by-frame-Arbeit in Figma, wiederholtes Abgleichen mit dem Brand-Guide, dann Übergabe an Engineering. Bei Brand-Änderungen synchronisiert man jede Datei manuell.

**Schmerz:** Erste Drafts dauern ewig, Brand-Wechsel bedeutet komponentenweise Bearbeitung, und Design und Engineering teilen nie eine einzige Wahrheit.

**OpenDesign:** Skizziere die Struktur auf der Leinwand, statt sie in einem Prompt zu beschreiben ── der Agent erzeugt code-level Prototypen aus der Skizze. Ein Wechsel des Design Systems tauscht automatisch Palette, Typografie und Spacing. Dual-Track-Kommentare trennen „Notiz an mich selbst" von „Anweisung an den Agenten". Das finale HTML ist sowohl das Design als auch das Engineering-Artefakt.

---

### 📋 Product Manager

**Heute:** PRD in Notion → Wireframe in Figma → Deck in Keynote → drei Dokumente von Hand abgleichen.

**Schmerz:** Drei Tools, dauerhaft asynchron. Eine „Live-Demo" für die Führung zu zeigen heißt auf Engineering warten.

**OpenDesign:** Generiere ein PM-Spec-Dokument (mit TOC + Decision Log) aus natürlicher Sprache; ein Satz erzeugt ein Magazin-Pitch-Deck für eine Seed-Runde; Live Artifact zieht echte Daten aus Notion / Linear, sodass eine funktionierende Produkt-Demo fünf Minuten statt einen Sprint braucht.

---

### 💻 Engineers

**Heute:** v0 / Bolt für Prototypen ── aber Modell und Schlüssel sind in deren Cloud eingesperrt, und es gibt keinen Weg, den Skill deines Teams in ein privates Repo zu forken.

**Schmerz:** Daten verlassen den Perimeter, Token-Verbrauch ist unvorhersehbar, Erweiterungen sind plattformseitig kuratiert, und das Design-Code-Handoff ist menschliche Übersetzung.

**OpenDesign:** BYOK gegen dein eigenes LLM-Gateway, jedes Projekt in lokalem SQLite. Ein Skill ist nur `SKILL.md` + `assets/` ── leg den Ordner in `skills/` ab, fertig. „Handoff to Coding Agent" reicht das Design an Cursor / Claude Code mit vollem Kontext.

---

### 📣 Marketing & Ops

**Heute:** Jede Kampagne braucht Design-Kapazität. Größenanpassung für Instagram / X / TikTok bedeutet manuelles Cropping pro Plattform.

**Schmerz:** Auf Design warten, jede Copy-/Farb-Änderung ist eine Neuerstellung, und 50 Karten pro Woche sind mehr, als Menschen tragen können.

**OpenDesign:** Ein Prompt liefert sechs nebeneinander stehende Social-Card-Varianten (Instagram-Cover / X-Header / TikTok-Hochformat ── deine Wahl). Wochenberichte / OKRs / Kanban-Dashboards leben auf Live Artifact, verdrahtet mit Notion / Linear / Slack ── einmal veröffentlichen, für immer aktualisieren.

## 🚀 Getting started

Drei Wege, wähle den passenden:

### 1️⃣ Desktop-App herunterladen (am schnellsten, keine Konfiguration)

Der einfachste Weg ── installieren, öffnen, und OD erkennt automatisch jeden Coding Agent in deinem `PATH`. Projekte persistieren lokal in SQLite.

- Desktop-Builds (macOS Apple Silicon · Windows x64): [open-design.ai](https://open-design.ai/)
- Frühere Releases: [GitHub Releases](https://github.com/nexu-io/open-design/releases)

Geeignet für: Einzelnutzer, Designer, PMs, die klicken und loslegen wollen.

### 2️⃣ In die Cloud deployen (team-shared)

Schiebe die Web-Schicht zu Vercel, teile sie im Team und übergib BYOK-Credentials per Env-Var. Der Daemon kann weiterhin lokal oder auf deinem eigenen Server laufen ── saubere Trennung Front/Back.

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/nexu-io/open-design"><img alt="Deploy to Vercel" src="https://img.shields.io/badge/Deploy_to-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  <a href="https://railway.app/new/template?template=https://github.com/nexu-io/open-design"><img alt="Deploy to Railway" src="https://img.shields.io/badge/Deploy_to-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" /></a>
  <a href="../deploy.md"><img alt="Self-host with Docker" src="https://img.shields.io/badge/Self--host-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" /></a>
</p>

Vollständiger Deployment-Guide: [`docs/deploy.md`](../deploy.md)

Geeignet für: kleine Teams und Startups, die eine geteilte Asset-Bibliothek + Design System wollen, ohne Infra zu betreiben.

### 3️⃣ Self-Host aus dem Quellcode (volle Kontrolle)

Klone das Repo und führe den vollen Stack ── Daemon + Web + optionale Electron-Shell ── auf deiner Maschine aus:

```bash
git clone https://github.com/nexu-io/open-design
cd open-design
pnpm install
pnpm tools-dev start
# → http://localhost:3000
```

Vollständiger Quickstart: [`QUICKSTART.md`](../../QUICKSTART.md) · Architektur & Optionen: [`docs/architecture.md`](../architecture.md)

Geeignet für: Entwickler und Unternehmen, die forken, eigene Skills hinzufügen oder ein internes LLM-Gateway anbinden müssen.

---

**Tiefere Dokumentation**

| | |
|---|---|
| 📐 [Architecture](../architecture.md) | Daemon · Protokoll-Parsing · BYOK-Proxy |
| 🧠 [Philosophy](../philosophy.md) | Junior-Designer-Modus · 5-dimensionale Selbstkritik · Anti-AI-Slop |
| 🤖 [Agents](../agents.md) | 16 CLIs im Detail |
| 🎨 [Design Systems](../design-systems.md) | 129 Systeme out of the box |
| 🛠️ [Skills](../../skills/) | der 31-Skill-Katalog |

## 🗺️ Roadmap

### ✅ Geliefert

- **🏠 Home** — Asset-Bibliothek (My Design / Templates / Brand Systems)
- **🎨 Studio** — vier Einstiegspunkte (Prototype / Slides / Media / Import); Chat + Datei-Verwaltung + Sketch + Sandboxed Preview; Editor mit Tweaks · Comment · Present; Export in HTML/PDF/PPT/ZIP/MD
- **⚙️ Setting** — Execute Mode (Harness / BYOK), 14 Media Provider, Composio Connector, integrierte Skills + MCP, Personalisierung

### 🟡 In Arbeit

- **🎨 Studio** — Live Artifact (Beta); Editors Edit · Draw · Voice editing
- **⚙️ Setting** — Memory (persönliches Recall, projektübergreifende Wiederverwendung); Coding Plan

### 🚧 Geplant

- **🎨 Studio** — Handoff to Coding Agent (die letzte Meile vom Design zum Code)
- **👭 Organization** — Workspace; Team-Skills & Memory; Projekt-Berechtigungen mit 4 Stufen (View / Comment / Edit / Private)

> Hast du Prioritäts-Feedback? Sag uns Bescheid auf [Issues](https://github.com/nexu-io/open-design/issues) oder [Discord](https://discord.gg/qhbcCH8Am4).

## 🤝 Contributing

Wir begrüßen jede Art von Beitrag ── neue Skills, neue Design Systems, Bugfixes, Übersetzungen.

- Fork & PR-Flow: [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Skill hinzufügen: lege einen Ordner in [`skills/`](../../skills/) ab und starte den Daemon neu ── siehe [`docs/skills-protocol.md`](../skills-protocol.md)
- Design System hinzufügen: schreibe ein `DESIGN.md` und lege es unter [`design-systems/`](../../design-systems/) ab
- Bugs / Feature Requests: [GitHub Issues](https://github.com/nexu-io/open-design/issues)

## 💬 Community

- 💭 [Discord](https://discord.gg/qhbcCH8Am4) ── tägliche Diskussion, Skill-Austausch, Hilfe-Threads
- 🐦 [@nexudotio](https://x.com/nexudotio) ── Produkt-Updates
- 🌟 Wenn dir Open Design gefällt, lass einen Star da ── das hilft sehr.

## 👥 Contributors

Danke an alle, die Open Design vorantreiben ── durch Code, Docs, Skills, Design Systems oder ein scharfes Issue. Die Wand unten ist die direkteste Art, *danke* zu sagen.

<a href="https://github.com/nexu-io/open-design/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nexu-io/open-design&max=500&columns=18&anon=0&cache_bust=2026-05-08" alt="Open Design contributors" />
</a>

<br/>

Erster PR? Willkommen. Die Labels [`good-first-issue` / `help-wanted`](https://github.com/nexu-io/open-design/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2C%22help+wanted%22) sind der Einstiegspunkt.


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

Open Design ist eine Etappe in einem Open-Source-Staffellauf. Es läuft dank der Vorarbeit ── die Projekte dieser Autoren bilden direkt das Fundament von OD:

<table>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://www.anthropic.com/"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://www.anthropic.com/"><b>Anthropic</b></a><br/>
  <sub><a href="https://www.anthropic.com/news/claude-design">Claude Design</a></sub><br/>
  <sub>Das Closed-Source-Produkt, zu dem dieses Repo eine offene Alternative bietet ── Ursprung des artifact-first-Denkmodells.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/alchaincyf"><img src="https://github.com/alchaincyf.png" width="64" height="64" style="border-radius:50%" alt="alchaincyf" /></a><br/>
  <a href="https://github.com/alchaincyf"><b>@alchaincyf</b> (Hua Shu)</a><br/>
  <sub><a href="https://github.com/alchaincyf/huashu-design"><code>huashu-design</code></a></sub><br/>
  <sub>Der Design-Philosophie-Kern ── Junior-Designer-Workflow, 5-Schritte-Brand-Asset-Protokoll, Anti-AI-Slop-Checkliste, 5-dimensionale Selbstkritik.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/op7418"><img src="https://github.com/op7418.png" width="64" height="64" style="border-radius:50%" alt="op7418" /></a><br/>
  <a href="https://github.com/op7418"><b>@op7418</b> (Guizang)</a><br/>
  <sub><a href="https://github.com/op7418/guizang-ppt-skill"><code>guizang-ppt-skill</code></a></sub><br/>
  <sub>Magazine-web-PPT-Skill 1:1 gebündelt, Default-Implementierung des Deck-Modus, Quelle der P0/P1/P2-Checklisten-Kultur.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/multica-ai"><img src="https://github.com/multica-ai.png" width="64" height="64" style="border-radius:50%" alt="multica-ai" /></a><br/>
  <a href="https://github.com/multica-ai"><b>@multica-ai</b></a><br/>
  <sub><a href="https://github.com/multica-ai/multica"><code>multica</code></a></sub><br/>
  <sub>Daemon + Adapter-Architektur, PATH-Scan-Agent-Erkennung, Agent-as-Teammate-Weltbild.</sub>
</td>
</tr>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/OpenCoworkAI"><img src="https://github.com/OpenCoworkAI.png" width="64" height="64" style="border-radius:50%" alt="OpenCoworkAI" /></a><br/>
  <a href="https://github.com/OpenCoworkAI"><b>@OpenCoworkAI</b></a><br/>
  <sub><a href="https://github.com/OpenCoworkAI/open-codesign"><code>open-codesign</code></a></sub><br/>
  <sub>Die erste Open-Source-Alternative zu Claude Design ── Streaming-Artifact-Loop, Sandbox-iframe-Preview, Live-Agent-Panel.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/VoltAgent"><img src="https://github.com/VoltAgent.png" width="64" height="64" style="border-radius:50%" alt="VoltAgent" /></a><br/>
  <a href="https://github.com/VoltAgent"><b>@VoltAgent</b></a><br/>
  <sub><a href="https://github.com/VoltAgent/awesome-design-md"><code>awesome-design-md</code></a></sub><br/>
  <sub>Quelle des 9-Sektionen-<code>DESIGN.md</code>-Schemas und der Importpfad für 69 Produktsysteme.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/farion1231"><img src="https://github.com/farion1231.png" width="64" height="64" style="border-radius:50%" alt="farion1231" /></a><br/>
  <a href="https://github.com/farion1231"><b>@farion1231</b></a><br/>
  <sub><a href="https://github.com/farion1231/cc-switch"><code>cc-switch</code></a></sub><br/>
  <sub>Symlink-basierte Skill-Verteilung über mehrere Agent-CLIs ── Inspiration und Referenzimplementierung.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/anthropics"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://github.com/anthropics"><b>@anthropics</b></a><br/>
  <sub><a href="https://docs.anthropic.com/en/docs/claude-code/skills">Claude Code Skills</a></sub><br/>
  <sub><code>SKILL.md</code>-Konvention 1:1 übernommen ── jeder Claude-Code-Skill landet in <code>skills/</code> und funktioniert.</sub>
</td>
</tr>
</table>

Hinter jeder Idee, jeder geliehenen Codezeile steht ein realer Autor. Wenn dir Open Design gefällt, gib bitte auch ihnen einen Star ⭐.

## 📄 License

[Apache-2.0](../../LICENSE)

Wenn Anthropic, OpenAI und Google die fortschrittlichste KI-Design-Fähigkeit hinter Paywalls einsperren, braucht die Welt immer noch eine andere Stimme ── **die Spitzentechnologie zurück auf den Schreibtisch jedes Entwicklers, Designers und Kreativen**.

Wir hoffen, dass eines Tages eine selbstständige Designerin sich keine Sorgen mehr um Abo-Gebühren machen muss und dass eine junge Person, die noch zur Schule geht, mit erstklassigen Werkzeugen ihr erstes Werk schaffen kann, auf das sie wirklich stolz ist.

> **Take it. Build with it. Make it yours.**

[cd]: https://www.anthropic.com/news/claude-design
