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
  <b>Português</b> · <a href="README.ru.md">Русский</a> ·
  <a href="README.ar.md">العربية</a> · <a href="README.tr.md">Türkçe</a> ·
  <a href="README.uk.md">Українська</a>
</p>

<br/>

> **A alternativa open-source ao [Claude Design][cd].** Local-first, executa direto **16 Coding Agents** incluindo OpenClaw, Claude Code, Hermes Agent.
>
> **129 design systems de marca** ── Linear / Stripe / Apple / Notion, troque com um clique.
>
> **31 Skills** ── Prototype / Live Artifact / Slides / Imagem / Vídeo / Áudio, cobertura completa.

---

## 📋 What

✨ **Open Design (OD) é a alternativa open-source ao [Claude Design][cd] — um workspace open-source que transforma linguagem natural em artefatos de design prontos para entrega.**

📝 Descreva seu design em uma frase, e o OD produz protótipos, Live Artifacts, Slides, imagens, vídeos e áudio entregáveis ── 🎨 com o cuidado de um designer sênior, não a uniformidade genérica das saídas de IA.

📤 Exporta para HTML, PDF, PPT, ZIP, Markdown e mais.

🤖 Movido por **Coding Agents** (Claude Code / Codex / Cursor Agent / OpenClaw — sua escolha). 📂 Cada Skill e Design System é um simples arquivo Markdown no seu projeto ── leia, edite, faça fork, compartilhe.

💻 **Local-first.** Todos os dados e o runtime vivem inteiramente na sua própria máquina.

## 💡 Why

🚀 Em abril de 2026, a Anthropic lançou o [Claude Design][cd] e mostrou, **pela primeira vez, que um LLM podia realmente fazer design** ── não escrever ensaios *sobre* design, mas **entregar um artefato de design real e usável**.

🔒 Mas ele permaneceu **closed-source, pago, somente em nuvem**, e travado nos modelos da Anthropic. Trocar o agente, auto-hospedar, BYOK ── nada disso era possível.

🔓 O Open Design abre a mesma capacidade: **escolha o modelo, mantenha as chaves, edite cada Skill e Design System como arquivo local** ── todo o sistema roda no seu próprio hardware.

🤝 Não estamos construindo mais um Agent. O Claude Code, Codex e Cursor Agent já no seu laptop são suficientes. **O que o OD faz é conectá-los a um workflow de design completo.**

## 🆚 Difference from other solutions

| | Claude Design | Figma | Lovable / v0 / Bolt | **Open Design** |
|---|---|---|---|---|
| **Open source** | ❌ | ❌ | ❌ | ✅ Apache-2.0 |
| **Local-first** | ❌ Só nuvem | ❌ Atrelado à nuvem | ❌ Só nuvem | ✅ Daemon + app desktop |
| **Agent** | Só Anthropic | Make-mode travado | Vendor-locked | ✅ 16 CLIs, sua escolha |
| **BYOK** | ❌ | ❌ | Parcial | ✅ Anthropic / OpenAI / Azure / Google |
| **Sistemas de marca** | Embutidos, fixos | Bibliotecas de equipe (privadas) | Theme JSON | ✅ 129 sistemas Markdown, totalmente customizáveis |
| **Extensão Skill** | Closed source | Marketplace de plugins (curado) | Closed source | ✅ Solte uma pasta, pronto |
| **Cenários** | Design geral | UI / protótipo / colaboração | Protótipos voltados a código | ✅ Design / marketing / ops / produto / finanças / RH |

## 🖼️ Demo

Quatro tipos de artefato centrais:

### 📐 Prototype

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/gamified-app.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><code>gamified-app</code></a> · Protótipo mobile gamificado ── palco escuro de três frames + barras XP + cards de quest</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/social-carousel.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><code>social-carousel</code></a> · Carrossel social ── três cards 1080×1080, manchetes conectadas</sub></td>
</tr>
</table>

### 🎞️ Slide

<table>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/kami-deck.png" width="380"/><br/><sub><b>Kami Deck</b> ── "Designing intelligence on warm paper", capa estilo revista</sub></td>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/open-design-landing-deck.png" width="380"/><br/><sub><b>Open Design Landing Deck</b> ── apresentação estilo landing page</sub></td>
</tr>
</table>

### 🖼️ Imagem

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/3d-stone-staircase-evolution-infographic.json"><img src="https://cms-assets.youmind.com/media/1776661968404_8a5flm_HGQc_KOaMAA2vt0.jpg" width="380"/></a><br/><sub><b>3D Stone Staircase Evolution Infographic</b> ── infográfico de três passos, estética de pedra esculpida</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/profile-avatar-glamorous-woman-in-black-portrait.json"><img src="https://cms-assets.youmind.com/media/1777453184257_vb9hvl_HG9tAkOa4AAuRrn.jpg" width="380"/></a><br/><sub><b>Glamorous Woman in Black Portrait</b> ── retrato de estúdio editorial</sub></td>
</tr>
</table>

### 🎬 Vídeo

<table>
<tr>
<td width="50%"><a href="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/downloads/default.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Luxury Supercar Cinematic</b> ── filme de produto narrativo, clique para tocar o MP4</sub></td>
<td width="50%"><a href="https://github.com/YouMind-OpenLab/awesome-seedance-2-prompts/releases/download/videos/1402.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7f63ad253175a9ad1dac53de490efac8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Japanese Romance Short Film</b> ── narrativa de 15s em Seedance 2.0</sub></td>
</tr>
</table>

## 🎯 Use cases

### 🎨 Designers

**Hoje:** Trabalho frame por frame no Figma, alinhando repetidamente com o brand guide e entregando arquivos para engenharia. Quando a marca muda, cada arquivo é sincronizado à mão.

**Dor:** Os primeiros drafts demoram uma eternidade, trocar de marca é trabalho componente por componente, e design e engenharia nunca compartilham uma única fonte de verdade.

**OpenDesign:** Esboce a estrutura no canvas em vez de descrevê-la em um prompt ── o agent gera protótipos em nível de código a partir do esboço. Trocar de Design System troca automaticamente paleta, tipografia e espaçamento. Comentários de duas vias separam "nota para mim" de "instrução para o agent". O HTML final é tanto o design quanto o artefato de engenharia.

---

### 📋 Product managers

**Hoje:** Escrever o PRD no Notion → wireframe no Figma → deck no Keynote → reconciliar três documentos à mão.

**Dor:** Três ferramentas, perpetuamente fora de sincronia. Mostrar uma "demo viva" para a liderança significa esperar a engenharia.

**OpenDesign:** Gera um PM Spec doc (com TOC + log de decisões) a partir de linguagem natural; uma frase produz um pitch deck estilo revista para uma rodada seed; Live Artifact puxa dados reais do Notion / Linear, então uma demo de produto funcionando leva cinco minutos em vez de uma sprint.

---

### 💻 Engineers

**Hoje:** v0 / Bolt para iniciar protótipos ── mas o modelo e a key estão travados na nuvem deles, e não há como dar fork no Skill do seu time para um repo privado.

**Dor:** Dados saem do perímetro, gasto de token é imprevisível, extensões são filtradas pela plataforma e o handoff design→código é tradução humana.

**OpenDesign:** BYOK contra seu próprio LLM gateway, cada projeto em SQLite local. Um Skill é só `SKILL.md` + `assets/` ── solte a pasta em `skills/`, pronto. "Handoff to Coding Agent" passa o design para Cursor / Claude Code com contexto preservado.

---

### 📣 Marketing & ops

**Hoje:** Cada campanha precisa de bandwidth de design. Dimensionar para Instagram / X / TikTok significa cortar manualmente para cada plataforma.

**Dor:** Esperar o design, cada ajuste de copy / cor é refazer, e 50 cards por semana é mais do que humanos conseguem sustentar.

**OpenDesign:** Um único prompt entrega seis variantes de cards sociais lado a lado (capa Instagram / header X / vertical TikTok, escolha sua). Relatórios semanais / OKRs / dashboards kanban vivem no Live Artifact, conectados a Notion / Linear / Slack ── publique uma vez, atualize para sempre.

## 🚀 Getting started

Três caminhos, escolha o que serve:

### 1️⃣ Baixe o app desktop (mais rápido, configuração zero)

O caminho mais simples ── instale, abra, e o OD detecta automaticamente cada Coding Agent já no seu `PATH`. Os projetos persistem localmente em SQLite.

- Builds desktop (macOS Apple Silicon · Windows x64): [open-design.ai](https://open-design.ai/)
- Releases anteriores: [GitHub Releases](https://github.com/nexu-io/open-design/releases)

Ideal para: usuários solo, designers, PMs que querem clicar e começar.

### 2️⃣ Faça deploy na nuvem (compartilhado pelo time)

Empurre a camada web para o Vercel, compartilhe pelo time, e entregue credenciais BYOK via env vars. O daemon ainda pode rodar localmente ou no seu próprio servidor ── separação limpa front/back.

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/nexu-io/open-design"><img alt="Deploy to Vercel" src="https://img.shields.io/badge/Deploy_to-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  <a href="https://railway.app/new/template?template=https://github.com/nexu-io/open-design"><img alt="Deploy to Railway" src="https://img.shields.io/badge/Deploy_to-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" /></a>
  <a href="../deploy.md"><img alt="Self-host with Docker" src="https://img.shields.io/badge/Self--host-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" /></a>
</p>

Guia completo de deploy: [`docs/deploy.md`](../deploy.md)

Ideal para: times pequenos e startups que querem uma biblioteca de assets + design system compartilhada sem operar infra.

### 3️⃣ Self-host a partir do código (controle total)

Clone o repo e rode a stack completa ── daemon + web + shell Electron opcional ── na sua própria máquina:

```bash
git clone https://github.com/nexu-io/open-design
cd open-design
pnpm install
pnpm tools-dev start
# → http://localhost:3000
```

Quickstart completo: [`QUICKSTART.md`](../../QUICKSTART.md) · Arquitetura & opções: [`docs/architecture.md`](../architecture.md)

Ideal para: desenvolvedores e empresas que precisam dar fork, adicionar Skills customizados, ou conectar a um LLM gateway interno.

---

**Documentação mais profunda**

| | |
|---|---|
| 📐 [Architecture](../architecture.md) | daemon · parsing de protocolo · proxy BYOK |
| 🧠 [Philosophy](../philosophy.md) | modo Junior-Designer · auto-crítica de 5 dimensões · anti-AI-slop |
| 🤖 [Agents](../agents.md) | 16 CLIs em detalhe |
| 🎨 [Design Systems](../design-systems.md) | 129 sistemas prontos |
| 🛠️ [Skills](../../skills/) | o catálogo de 31 Skills |

## 🗺️ Roadmap

### ✅ Entregue

- **🏠 Home** — biblioteca de assets (My Design / Templates / Brand Systems)
- **🎨 Studio** — quatro pontos de entrada (Prototype / Slides / Media / Import); Chat + gerência de arquivos + Sketch + Preview em sandbox; Editor com Tweaks · Comment · Present; export HTML/PDF/PPT/ZIP/MD
- **⚙️ Setting** — Execute Mode (Harness / BYOK), 14 Media Providers, Composio Connector, Skills + MCP integrados, personalização

### 🟡 Em andamento

- **🎨 Studio** — Live Artifact (Beta); Edit · Draw · Voice editing do Editor
- **⚙️ Setting** — Memory (memória pessoal, reuso entre projetos); Coding Plan

### 🚧 Planejado

- **🎨 Studio** — Handoff to Coding Agent (último km design→código)
- **👭 Organization** — Workspace; Skill & Memory por equipe; permissões de projeto em 4 níveis (View / Comment / Edit / Private)

> Tem feedback sobre prioridades? Conte para nós em [Issues](https://github.com/nexu-io/open-design/issues) ou [Discord](https://discord.gg/qhbcCH8Am4).

## 🤝 Contributing

Damos as boas-vindas a todo tipo de contribuição ── novos Skills, novos Design Systems, correções de bugs, traduções.

- Fluxo Fork & PR: [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Adicionar um Skill: solte uma pasta em [`skills/`](../../skills/) e reinicie o daemon ── veja [`docs/skills-protocol.md`](../skills-protocol.md)
- Adicionar um Design System: escreva um `DESIGN.md` e coloque em [`design-systems/`](../../design-systems/)
- Bugs / pedidos de feature: [GitHub Issues](https://github.com/nexu-io/open-design/issues)

## 💬 Community

- 💭 [Discord](https://discord.gg/qhbcCH8Am4) ── discussão diária, troca de Skills, threads de ajuda
- 🐦 [@nexudotio](https://x.com/nexudotio) ── atualizações do produto
- 🌟 Se você gosta do Open Design, deixe uma Star ── ajuda muito.

## 👥 Contributors

Obrigado a todos que estão movendo o Open Design adiante ── por meio de código, docs, Skills, Design Systems ou um Issue afiado. O mural abaixo é a forma mais direta de dizer *obrigado*.

<a href="https://github.com/nexu-io/open-design/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nexu-io/open-design&max=500&columns=18&anon=0&cache_bust=2026-05-08" alt="Open Design contributors" />
</a>

<br/>

Primeiro PR? Bem-vindo. As labels [`good-first-issue` / `help-wanted`](https://github.com/nexu-io/open-design/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2C%22help+wanted%22) são o ponto de entrada.


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

Open Design é uma etapa de uma corrida de revezamento open-source. Ele funciona graças ao trabalho que veio antes ── os projetos destes autores formam diretamente a base do OD:

<table>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://www.anthropic.com/"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://www.anthropic.com/"><b>Anthropic</b></a><br/>
  <sub><a href="https://www.anthropic.com/news/claude-design">Claude Design</a></sub><br/>
  <sub>O produto fechado para o qual este repo oferece uma alternativa aberta ── origem do modelo mental artifact-first.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/alchaincyf"><img src="https://github.com/alchaincyf.png" width="64" height="64" style="border-radius:50%" alt="alchaincyf" /></a><br/>
  <a href="https://github.com/alchaincyf"><b>@alchaincyf</b> (Hua Shu)</a><br/>
  <sub><a href="https://github.com/alchaincyf/huashu-design"><code>huashu-design</code></a></sub><br/>
  <sub>O núcleo da filosofia de design ── workflow Junior-Designer, protocolo de 5 passos para ativos de marca, anti-AI-slop checklist, auto-crítica de 5 dimensões.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/op7418"><img src="https://github.com/op7418.png" width="64" height="64" style="border-radius:50%" alt="op7418" /></a><br/>
  <a href="https://github.com/op7418"><b>@op7418</b> (Guizang)</a><br/>
  <sub><a href="https://github.com/op7418/guizang-ppt-skill"><code>guizang-ppt-skill</code></a></sub><br/>
  <sub>Skill Magazine-web-PPT empacotado tal qual, implementação default do modo Deck, fonte da cultura de checklists P0/P1/P2.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/multica-ai"><img src="https://github.com/multica-ai.png" width="64" height="64" style="border-radius:50%" alt="multica-ai" /></a><br/>
  <a href="https://github.com/multica-ai"><b>@multica-ai</b></a><br/>
  <sub><a href="https://github.com/multica-ai/multica"><code>multica</code></a></sub><br/>
  <sub>Arquitetura daemon + adapter, detecção de agent por scan de PATH, visão agent-as-teammate.</sub>
</td>
</tr>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/OpenCoworkAI"><img src="https://github.com/OpenCoworkAI.png" width="64" height="64" style="border-radius:50%" alt="OpenCoworkAI" /></a><br/>
  <a href="https://github.com/OpenCoworkAI"><b>@OpenCoworkAI</b></a><br/>
  <sub><a href="https://github.com/OpenCoworkAI/open-codesign"><code>open-codesign</code></a></sub><br/>
  <sub>A primeira alternativa open-source ao Claude Design ── loop streaming-artifact, preview iframe em sandbox, painel de agent ao vivo.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/VoltAgent"><img src="https://github.com/VoltAgent.png" width="64" height="64" style="border-radius:50%" alt="VoltAgent" /></a><br/>
  <a href="https://github.com/VoltAgent"><b>@VoltAgent</b></a><br/>
  <sub><a href="https://github.com/VoltAgent/awesome-design-md"><code>awesome-design-md</code></a></sub><br/>
  <sub>Origem do schema <code>DESIGN.md</code> de 9 seções e o caminho de import para 69 product systems.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/farion1231"><img src="https://github.com/farion1231.png" width="64" height="64" style="border-radius:50%" alt="farion1231" /></a><br/>
  <a href="https://github.com/farion1231"><b>@farion1231</b></a><br/>
  <sub><a href="https://github.com/farion1231/cc-switch"><code>cc-switch</code></a></sub><br/>
  <sub>Distribuição de skills baseada em symlinks entre múltiplos agent CLIs ── inspiração e implementação de referência.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/anthropics"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://github.com/anthropics"><b>@anthropics</b></a><br/>
  <sub><a href="https://docs.anthropic.com/en/docs/claude-code/skills">Claude Code Skills</a></sub><br/>
  <sub>Convenção <code>SKILL.md</code> adotada como está ── qualquer skill do Claude Code cai em <code>skills/</code> e funciona.</sub>
</td>
</tr>
</table>

Cada ideia, cada linha de código emprestada, tem um autor real por trás. Se você gosta do Open Design, por favor dê uma Star a eles também ⭐.

## 📄 License

[Apache-2.0](../../LICENSE)

Quando Anthropic, OpenAI e Google trancam a capacidade de design por IA mais avançada atrás de paywalls, o mundo ainda precisa de outra voz ── **trazer a fronteira da tecnologia de volta para a mesa de cada desenvolvedor, designer e criador**.

Esperamos que um dia uma designer independente não precise mais se preocupar com taxas de assinatura, e que um estudante ainda na escola consiga usar ferramentas de primeira linha para criar a primeira obra da qual ele se orgulhe verdadeiramente.

> **Take it. Build with it. Make it yours.**

[cd]: https://www.anthropic.com/news/claude-design
