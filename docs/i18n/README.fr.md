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
  <a href="README.de.md">Deutsch</a> · <b>Français</b> ·
  <a href="README.pt-BR.md">Português</a> · <a href="README.ru.md">Русский</a> ·
  <a href="README.ar.md">العربية</a> · <a href="README.tr.md">Türkçe</a> ·
  <a href="README.uk.md">Українська</a>
</p>

<br/>

> **L'alternative open source à [Claude Design][cd].** Local-first, exécute directement **16 Coding Agents** dont OpenClaw, Claude Code, Hermes Agent.
>
> **129 design systems de marque** ── Linear / Stripe / Apple / Notion, échangeables d'un clic.
>
> **31 Skills** ── Prototype / Live Artifact / Slides / Image / Vidéo / Audio, couverture complète.

---

## 📋 What

✨ **Open Design (OD) est l'alternative open source à [Claude Design][cd] — un workspace open source qui transforme le langage naturel en livrables de design prêts à expédier.**

📝 Décrivez votre design en une phrase, et OD produit prototypes, Live Artifacts, Slides, images, vidéos et audio livrables ── 🎨 avec le savoir-faire d'un designer sénior, pas l'uniformité des sorties IA génériques.

📤 Export en HTML, PDF, PPT, ZIP, Markdown et plus.

🤖 Piloté par des **Coding Agents** (Claude Code / Codex / Cursor Agent / OpenClaw — au choix). 📂 Chaque Skill et Design System est un simple fichier Markdown dans votre projet ── lisez, éditez, forkez, partagez.

💻 **Local-first.** Toutes les données et le runtime vivent entièrement sur votre propre machine.

## 💡 Why

🚀 En avril 2026, Anthropic a publié [Claude Design][cd] et a montré, **pour la première fois, qu'un LLM pouvait vraiment faire du design** ── pas écrire des essais *sur* le design, mais **livrer un véritable artefact de design utilisable**.

🔒 Mais c'est resté **fermé, payant, en cloud uniquement**, et verrouillé sur les modèles d'Anthropic. Changer d'agent, auto-héberger, BYOK ── rien de tout cela n'était possible.

🔓 Open Design ouvre la même capacité : **choisissez le modèle, gardez les clés, éditez chaque Skill et Design System comme un fichier local** ── tout le système tourne sur votre propre matériel.

🤝 Nous ne construisons pas un énième Agent. Les Claude Code, Codex et Cursor Agent déjà installés sur votre laptop suffisent. **Ce que fait OD, c'est les câbler dans un workflow de design complet.**

## 🆚 Difference from other solutions

| | Claude Design | Figma | Lovable / v0 / Bolt | **Open Design** |
|---|---|---|---|---|
| **Open source** | ❌ | ❌ | ❌ | ✅ Apache-2.0 |
| **Local-first** | ❌ Cloud uniquement | ❌ Lié au cloud | ❌ Cloud uniquement | ✅ Daemon + app desktop |
| **Agent** | Anthropic seulement | Make-mode verrouillé | Verrouillé au vendor | ✅ 16 CLIs, votre choix |
| **BYOK** | ❌ | ❌ | Partiel | ✅ Anthropic / OpenAI / Azure / Google |
| **Systèmes de marque** | Intégrés, fixes | Bibliothèques d'équipe (privées) | JSON de thème | ✅ 129 systèmes Markdown, totalement personnalisables |
| **Extension Skill** | Fermé | Marketplace de plugins (curé) | Fermé | ✅ Déposez un dossier, c'est fait |
| **Scénarios** | Design général | UI / prototype / collab | Prototypes orientés code | ✅ Design / marketing / ops / produit / finance / RH |

## 🖼️ Demo

Quatre types d'artefacts au cœur :

### 📐 Prototype

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/gamified-app.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><code>gamified-app</code></a> · Prototype mobile gamifié ── scène sombre à trois cadres + barres XP + cartes de quête</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/social-carousel.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><code>social-carousel</code></a> · Carrousel social ── trois cartes 1080×1080, titres reliés</sub></td>
</tr>
</table>

### 🎞️ Slide

<table>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/kami-deck.png" width="380"/><br/><sub><b>Kami Deck</b> ── « Designing intelligence on warm paper », couverture style magazine</sub></td>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/open-design-landing-deck.png" width="380"/><br/><sub><b>Open Design Landing Deck</b> ── présentation style landing page</sub></td>
</tr>
</table>

### 🖼️ Image

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/3d-stone-staircase-evolution-infographic.json"><img src="https://cms-assets.youmind.com/media/1776661968404_8a5flm_HGQc_KOaMAA2vt0.jpg" width="380"/></a><br/><sub><b>3D Stone Staircase Evolution Infographic</b> ── infographie en trois étapes, esthétique pierre taillée</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/profile-avatar-glamorous-woman-in-black-portrait.json"><img src="https://cms-assets.youmind.com/media/1777453184257_vb9hvl_HG9tAkOa4AAuRrn.jpg" width="380"/></a><br/><sub><b>Glamorous Woman in Black Portrait</b> ── portrait studio éditorial</sub></td>
</tr>
</table>

### 🎬 Vidéo

<table>
<tr>
<td width="50%"><a href="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/downloads/default.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Luxury Supercar Cinematic</b> ── film produit narratif, cliquez pour lire le MP4</sub></td>
<td width="50%"><a href="https://github.com/YouMind-OpenLab/awesome-seedance-2-prompts/releases/download/videos/1402.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7f63ad253175a9ad1dac53de490efac8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Japanese Romance Short Film</b> ── narration de 15s en Seedance 2.0</sub></td>
</tr>
</table>

## 🎯 Use cases

### 🎨 Designers

**Aujourd'hui :** Travail image par image dans Figma, alignement répété sur la charte de marque, puis livraison à l'ingénierie. Quand la marque évolue, chaque fichier est synchronisé à la main.

**Douleur :** Les premières maquettes prennent une éternité, les changements de marque sont un travail composant par composant, et le design et l'ingénierie ne partagent jamais une seule source de vérité.

**OpenDesign :** Esquissez la structure sur le canvas au lieu de la décrire dans un prompt ── l'agent génère des prototypes au niveau code à partir du croquis. Changer de Design System échange automatiquement palette, typo et espacement. Les commentaires double-piste séparent « note pour moi » d'« instruction à l'agent ». Le HTML final est à la fois le design et l'artefact d'ingénierie.

---

### 📋 Product managers

**Aujourd'hui :** PRD dans Notion → wireframe dans Figma → deck dans Keynote → réconcilier trois documents à la main.

**Douleur :** Trois outils, perpétuellement désynchronisés. Montrer une « démo vivante » au leadership signifie attendre l'ingénierie.

**OpenDesign :** Génère un document PM Spec (avec TOC + journal de décisions) depuis le langage naturel ; une phrase produit un pitch deck style magazine pour un seed round ; Live Artifact tire des données réelles de Notion / Linear, et une démo produit fonctionnelle prend cinq minutes au lieu d'un sprint.

---

### 💻 Engineers

**Aujourd'hui :** v0 / Bolt pour démarrer des prototypes ── mais le modèle et la clé sont verrouillés dans leur cloud, et il n'y a pas moyen de forker le Skill de votre équipe dans un repo privé.

**Douleur :** Les données sortent du périmètre, la dépense en tokens est imprévisible, les extensions sont filtrées par la plateforme, et le passage design→code est de la traduction humaine.

**OpenDesign :** BYOK contre votre propre passerelle LLM, chaque projet sur SQLite local. Un Skill est juste `SKILL.md` + `assets/` ── glissez le dossier dans `skills/`, c'est fait. « Handoff to Coding Agent » passe le design à Cursor / Claude Code en préservant tout le contexte.

---

### 📣 Marketing & ops

**Aujourd'hui :** Chaque campagne a besoin de bande passante design. Le dimensionnement pour Instagram / X / TikTok signifie un cropping manuel pour chaque plateforme.

**Douleur :** Attendre le design, chaque ajustement de copy / couleur est à refaire, et 50 cartes par semaine c'est plus que ce que les humains peuvent soutenir.

**OpenDesign :** Un seul prompt génère six variantes de cartes sociales en parallèle (cover Instagram / header X / vertical TikTok, à votre choix). Reportings hebdo / OKRs / dashboards kanban vivent sur Live Artifact, câblés à Notion / Linear / Slack ── publiez une fois, rafraîchissez pour toujours.

## 🚀 Getting started

Trois façons, choisissez celle qui correspond :

### 1️⃣ Téléchargez l'app desktop (le plus rapide, zéro config)

Le chemin le plus simple ── installez, ouvrez, et OD détecte automatiquement chaque Coding Agent déjà sur votre `PATH`. Les projets persistent localement en SQLite.

- Builds desktop (macOS Apple Silicon · Windows x64) : [open-design.ai](https://open-design.ai/)
- Versions précédentes : [GitHub Releases](https://github.com/nexu-io/open-design/releases)

Idéal pour : utilisateurs solo, designers, PM qui veulent cliquer et commencer.

### 2️⃣ Déployez dans le cloud (partagé en équipe)

Poussez la couche web vers Vercel, partagez-la dans l'équipe, et fournissez les credentials BYOK via env vars. Le daemon peut continuer à tourner localement ou sur votre propre serveur ── séparation propre front/back.

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/nexu-io/open-design"><img alt="Deploy to Vercel" src="https://img.shields.io/badge/Deploy_to-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  <a href="https://railway.app/new/template?template=https://github.com/nexu-io/open-design"><img alt="Deploy to Railway" src="https://img.shields.io/badge/Deploy_to-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" /></a>
  <a href="../deploy.md"><img alt="Self-host with Docker" src="https://img.shields.io/badge/Self--host-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" /></a>
</p>

Guide complet de déploiement : [`docs/deploy.md`](../deploy.md)

Idéal pour : petites équipes et startups qui veulent une bibliothèque d'assets + design system partagés sans gérer l'infra.

### 3️⃣ Self-host depuis le code source (contrôle total)

Clonez le repo et exécutez la pile complète ── daemon + web + shell Electron optionnel ── sur votre propre machine :

```bash
git clone https://github.com/nexu-io/open-design
cd open-design
pnpm install
pnpm tools-dev start
# → http://localhost:3000
```

Quickstart complet : [`QUICKSTART.md`](../../QUICKSTART.md) · Architecture & options : [`docs/architecture.md`](../architecture.md)

Idéal pour : développeurs et entreprises qui ont besoin de forker, ajouter des Skills personnalisés, ou brancher une passerelle LLM interne.

---

**Documentation plus profonde**

| | |
|---|---|
| 📐 [Architecture](../architecture.md) | daemon · parsing du protocole · proxy BYOK |
| 🧠 [Philosophy](../philosophy.md) | mode Junior-Designer · auto-critique 5 dimensions · anti-AI-slop |
| 🤖 [Agents](../agents.md) | 16 CLIs en détail |
| 🎨 [Design Systems](../design-systems.md) | 129 systèmes prêts à l'emploi |
| 🛠️ [Skills](../../skills/) | le catalogue de 31 Skills |

## 🗺️ Roadmap

### ✅ Livré

- **🏠 Home** — bibliothèque d'assets (My Design / Templates / Brand Systems)
- **🎨 Studio** — quatre points d'entrée (Prototype / Slides / Media / Import) ; Chat + gestion de fichiers + Sketch + Preview en sandbox ; Editor avec Tweaks · Comment · Present ; export HTML/PDF/PPT/ZIP/MD
- **⚙️ Setting** — Execute Mode (Harness / BYOK), 14 Media Providers, Composio Connector, Skills + MCP intégrés, personnalisation

### 🟡 En cours

- **🎨 Studio** — Live Artifact (Beta) ; Edit · Draw · Voice editing de l'Editor
- **⚙️ Setting** — Memory (mémoire personnelle, réutilisation cross-projet) ; Coding Plan

### 🚧 Planifié

- **🎨 Studio** — Handoff to Coding Agent (le dernier kilomètre design→code)
- **👭 Organization** — Workspace ; Skill & Memory au niveau équipe ; permissions de projet à 4 niveaux (View / Comment / Edit / Private)

> Vous avez du feedback sur les priorités ? Dites-le-nous sur [Issues](https://github.com/nexu-io/open-design/issues) ou [Discord](https://discord.gg/qhbcCH8Am4).

## 🤝 Contributing

Nous accueillons toute forme de contribution ── nouveaux Skills, nouveaux Design Systems, corrections de bugs, traductions.

- Flow Fork & PR : [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Ajouter un Skill : déposez un dossier dans [`skills/`](../../skills/) et redémarrez le daemon ── voir [`docs/skills-protocol.md`](../skills-protocol.md)
- Ajouter un Design System : écrivez un `DESIGN.md` et placez-le sous [`design-systems/`](../../design-systems/)
- Demandes de bugs / fonctionnalités : [GitHub Issues](https://github.com/nexu-io/open-design/issues)

## 💬 Community

- 💭 [Discord](https://discord.gg/qhbcCH8Am4) ── discussion quotidienne, échange de Skills, fils d'aide
- 🐦 [@nexudotio](https://x.com/nexudotio) ── mises à jour produit
- 🌟 Si Open Design vous plaît, laissez une Star ── ça aide vraiment.

## 👥 Contributors

Merci à toutes celles et ceux qui font avancer Open Design ── par du code, des docs, des Skills, des Design Systems ou un Issue bien senti. Le mur ci-dessous est la façon la plus directe de dire *merci*.

<a href="https://github.com/nexu-io/open-design/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nexu-io/open-design&max=500&columns=18&anon=0&cache_bust=2026-05-08" alt="Open Design contributors" />
</a>

<br/>

Premier PR ? Bienvenue. Les labels [`good-first-issue` / `help-wanted`](https://github.com/nexu-io/open-design/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2C%22help+wanted%22) sont le point d'entrée.


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

Open Design est une étape d'un relais open source. Il fonctionne grâce au travail antérieur ── les projets de ces auteurs forment directement les fondations d'OD :

<table>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://www.anthropic.com/"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://www.anthropic.com/"><b>Anthropic</b></a><br/>
  <sub><a href="https://www.anthropic.com/news/claude-design">Claude Design</a></sub><br/>
  <sub>Le produit fermé auquel ce repo offre une alternative ouverte ── origine du modèle mental artifact-first.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/alchaincyf"><img src="https://github.com/alchaincyf.png" width="64" height="64" style="border-radius:50%" alt="alchaincyf" /></a><br/>
  <a href="https://github.com/alchaincyf"><b>@alchaincyf</b> (Hua Shu)</a><br/>
  <sub><a href="https://github.com/alchaincyf/huashu-design"><code>huashu-design</code></a></sub><br/>
  <sub>Le cœur de la philosophie de design ── workflow Junior-Designer, protocole 5 étapes pour les actifs de marque, checklist anti-AI-slop, auto-critique 5 dimensions.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/op7418"><img src="https://github.com/op7418.png" width="64" height="64" style="border-radius:50%" alt="op7418" /></a><br/>
  <a href="https://github.com/op7418"><b>@op7418</b> (Guizang)</a><br/>
  <sub><a href="https://github.com/op7418/guizang-ppt-skill"><code>guizang-ppt-skill</code></a></sub><br/>
  <sub>Skill Magazine-web-PPT bundlé tel quel, implémentation par défaut du mode Deck, source de la culture des checklists P0/P1/P2.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/multica-ai"><img src="https://github.com/multica-ai.png" width="64" height="64" style="border-radius:50%" alt="multica-ai" /></a><br/>
  <a href="https://github.com/multica-ai"><b>@multica-ai</b></a><br/>
  <sub><a href="https://github.com/multica-ai/multica"><code>multica</code></a></sub><br/>
  <sub>Architecture daemon + adapter, détection d'agent par scan du PATH, vision agent-as-teammate.</sub>
</td>
</tr>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/OpenCoworkAI"><img src="https://github.com/OpenCoworkAI.png" width="64" height="64" style="border-radius:50%" alt="OpenCoworkAI" /></a><br/>
  <a href="https://github.com/OpenCoworkAI"><b>@OpenCoworkAI</b></a><br/>
  <sub><a href="https://github.com/OpenCoworkAI/open-codesign"><code>open-codesign</code></a></sub><br/>
  <sub>La première alternative open source à Claude Design ── boucle streaming-artifact, preview iframe sandbox, panneau d'agent en direct.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/VoltAgent"><img src="https://github.com/VoltAgent.png" width="64" height="64" style="border-radius:50%" alt="VoltAgent" /></a><br/>
  <a href="https://github.com/VoltAgent"><b>@VoltAgent</b></a><br/>
  <sub><a href="https://github.com/VoltAgent/awesome-design-md"><code>awesome-design-md</code></a></sub><br/>
  <sub>Source du schéma <code>DESIGN.md</code> en 9 sections et chemin d'import pour 69 product systems.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/farion1231"><img src="https://github.com/farion1231.png" width="64" height="64" style="border-radius:50%" alt="farion1231" /></a><br/>
  <a href="https://github.com/farion1231"><b>@farion1231</b></a><br/>
  <sub><a href="https://github.com/farion1231/cc-switch"><code>cc-switch</code></a></sub><br/>
  <sub>Distribution de skills par symlinks à travers plusieurs CLIs d'agent ── inspiration et implémentation de référence.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/anthropics"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://github.com/anthropics"><b>@anthropics</b></a><br/>
  <sub><a href="https://docs.anthropic.com/en/docs/claude-code/skills">Claude Code Skills</a></sub><br/>
  <sub>Convention <code>SKILL.md</code> adoptée telle quelle ── tout skill Claude Code se dépose dans <code>skills/</code> et fonctionne.</sub>
</td>
</tr>
</table>

Chaque idée, chaque ligne de code empruntée, a un auteur réel derrière elle. Si Open Design vous plaît, allez aussi leur laisser une Star ⭐.

## 📄 License

[Apache-2.0](../../LICENSE)

Quand Anthropic, OpenAI et Google enferment la capacité IA de design la plus avancée derrière des paywalls, le monde a encore besoin d'une autre voix ── **ramener la frontière de la technologie sur le bureau de chaque développeur, designer et créateur**.

Nous espérons qu'un jour une designer indépendante n'aura plus à s'inquiéter des frais d'abonnement, et qu'un étudiant encore à l'école pourra utiliser des outils de premier plan pour réaliser la première œuvre dont il sera vraiment fier.

> **Take it. Build with it. Make it yours.**

[cd]: https://www.anthropic.com/news/claude-design
