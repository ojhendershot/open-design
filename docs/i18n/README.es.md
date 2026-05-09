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
  <a href="README.ko.md">한국어</a> · <b>Español</b> ·
  <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> ·
  <a href="README.pt-BR.md">Português</a> · <a href="README.ru.md">Русский</a> ·
  <a href="README.ar.md">العربية</a> · <a href="README.tr.md">Türkçe</a> ·
  <a href="README.uk.md">Українська</a>
</p>

<br/>

> **La alternativa de código abierto a [Claude Design][cd].** Local-first, ejecuta directamente **16 Coding Agents** incluyendo OpenClaw, Claude Code, Hermes Agent.
>
> **129 sistemas de diseño de marca** ── Linear / Stripe / Apple / Notion, intercambiables con un clic.
>
> **31 Skills** ── Prototype / Live Artifact / Slides / Imagen / Vídeo / Audio, cobertura completa.

---

## 📋 What

✨ **Open Design (OD) es la alternativa open-source a [Claude Design][cd] — un workspace de código abierto que convierte lenguaje natural en artefactos de diseño listos para entregar.**

📝 Describe tu diseño en una frase y OD produce prototipos, Live Artifacts, Slides, imágenes, vídeos y audio entregables ── 🎨 con la artesanía de un diseñador senior, no la uniformidad genérica de la IA común.

📤 Exporta a HTML, PDF, PPT, ZIP, Markdown y más.

🤖 Impulsado por **Coding Agents** (Claude Code / Codex / Cursor Agent / OpenClaw — tú eliges). 📂 Cada Skill y Design System es un simple archivo Markdown en tu proyecto ── lee, edita, bifurca y comparte.

💻 **Local-first.** Todos los datos y el runtime viven íntegramente en tu propia máquina.

## 💡 Why

🚀 En abril de 2026, Anthropic publicó [Claude Design][cd] y demostró, **por primera vez, que un LLM podía diseñar de verdad** ── no escribir ensayos *sobre* diseño, sino **entregar un artefacto de diseño real y usable**.

🔒 Pero quedó **cerrado, de pago, solo en la nube**, atado a los modelos de Anthropic. Cambiar el agente, autohospedar, BYOK ── nada de eso era posible.

🔓 Open Design abre la misma capacidad: **elige el modelo, conserva las llaves, edita cada Skill y Design System como archivo local** ── el sistema completo se ejecuta en tu hardware.

🤝 No estamos construyendo otro Agente más. Claude Code, Codex y Cursor Agent que ya están en tu portátil son suficientes. **Lo que hace OD es conectarlos a un flujo completo de diseño.**

## 🆚 Difference from other solutions

| | Claude Design | Figma | Lovable / v0 / Bolt | **Open Design** |
|---|---|---|---|---|
| **Código abierto** | ❌ | ❌ | ❌ | ✅ Apache-2.0 |
| **Local-first** | ❌ Solo nube | ❌ Datos en la nube | ❌ Solo nube | ✅ Daemon + app de escritorio |
| **Agente** | Solo Anthropic | Make-mode bloqueado | Bloqueado al proveedor | ✅ 16 CLIs, tu eliges |
| **BYOK** | ❌ | ❌ | Parcial | ✅ Anthropic / OpenAI / Azure / Google |
| **Sistemas de marca** | Integrados, fijos | Bibliotecas de equipo (privadas) | Theme JSON | ✅ 129 sistemas Markdown, totalmente personalizables |
| **Extensión Skill** | Cerrado | Marketplace de plugins (con filtro) | Cerrado | ✅ Suelta una carpeta, listo |
| **Escenarios** | Diseño general | UI / prototipo / colaboración | Prototipos centrados en código | ✅ Diseño / marketing / ops / producto / finanzas / RR.HH. |

## 🖼️ Demo

Cuatro tipos de artefactos núcleo:

### 📐 Prototype

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/gamified-app.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><code>gamified-app</code></a> · Prototipo móvil gamificado ── escenario oscuro de tres marcos + barras XP + tarjetas de misión</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/social-carousel.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><code>social-carousel</code></a> · Carrusel social ── tres tarjetas 1080×1080, titulares conectados</sub></td>
</tr>
</table>

### 🎞️ Slide

<table>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/kami-deck.png" width="380"/><br/><sub><b>Kami Deck</b> ── "Designing intelligence on warm paper", portada estilo revista</sub></td>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/open-design-landing-deck.png" width="380"/><br/><sub><b>Open Design Landing Deck</b> ── presentación tipo landing-page</sub></td>
</tr>
</table>

### 🖼️ Imagen

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/3d-stone-staircase-evolution-infographic.json"><img src="https://cms-assets.youmind.com/media/1776661968404_8a5flm_HGQc_KOaMAA2vt0.jpg" width="380"/></a><br/><sub><b>3D Stone Staircase Evolution Infographic</b> ── infografía de tres pasos en estética de piedra tallada</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/profile-avatar-glamorous-woman-in-black-portrait.json"><img src="https://cms-assets.youmind.com/media/1777453184257_vb9hvl_HG9tAkOa4AAuRrn.jpg" width="380"/></a><br/><sub><b>Glamorous Woman in Black Portrait</b> ── retrato de estudio editorial</sub></td>
</tr>
</table>

### 🎬 Vídeo

<table>
<tr>
<td width="50%"><a href="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/downloads/default.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Luxury Supercar Cinematic</b> ── film narrativo de producto, clic para reproducir MP4</sub></td>
<td width="50%"><a href="https://github.com/YouMind-OpenLab/awesome-seedance-2-prompts/releases/download/videos/1402.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7f63ad253175a9ad1dac53de490efac8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Japanese Romance Short Film</b> ── narrativa de 15s en Seedance 2.0</sub></td>
</tr>
</table>

## 🎯 Use cases

### 🎨 Diseñadores

**Hoy:** Trabajo cuadro a cuadro en Figma, alineando repetidamente con la guía de marca, y luego entregando archivos a ingeniería. Cuando la marca cambia, cada archivo se sincroniza a mano.

**Dolor:** Los borradores iniciales tardan una eternidad, los cambios de marca son edición por componentes, y diseño e ingeniería nunca comparten una única fuente de verdad.

**OpenDesign:** Boceta la estructura en el lienzo en lugar de describirla en un prompt ── el agente genera prototipos a nivel de código a partir del boceto. Cambiar de Design System intercambia automáticamente paleta, tipografía y espaciado. Los comentarios de doble vía separan "nota personal" de "instrucción al agente". El HTML final es a la vez el diseño y el artefacto de ingeniería.

---

### 📋 Product managers

**Hoy:** Escribir el PRD en Notion → wireframe en Figma → construir el deck en Keynote → conciliar tres documentos a mano.

**Dolor:** Tres herramientas, perpetuamente desincronizadas. Mostrar una "demo viva" al liderazgo significa esperar a ingeniería.

**OpenDesign:** Genera un documento PM Spec (con TOC + bitácora de decisiones) desde lenguaje natural; una frase produce un pitch deck estilo revista para una ronda seed; Live Artifact toma datos reales de Notion / Linear, y una demo funcional toma cinco minutos en lugar de un sprint.

---

### 💻 Ingenieros

**Hoy:** v0 / Bolt para iniciar prototipos ── pero el modelo y la clave están bloqueados en su nube, y no hay forma de bifurcar el Skill de tu equipo a un repositorio privado.

**Dolor:** Los datos salen del perímetro, el gasto en tokens es impredecible, las extensiones están restringidas por la plataforma y el handoff diseño-código es traducción humana.

**OpenDesign:** BYOK contra tu propio LLM gateway, cada proyecto en SQLite local. Un Skill es solo `SKILL.md` + `assets/` ── suelta la carpeta en `skills/`, listo. "Handoff to Coding Agent" pasa el diseño a Cursor / Claude Code preservando el contexto completo.

---

### 📣 Marketing & ops

**Hoy:** Cada campaña necesita ancho de banda de diseño. Dimensionar para Instagram / X / TikTok significa recortar manualmente para cada plataforma.

**Dolor:** Esperar al diseño, cada ajuste de copy / color es rehacer, y 50 tarjetas a la semana es más de lo que las personas pueden sostener.

**OpenDesign:** Un solo prompt produce seis variantes de tarjeta social en paralelo (cubierta Instagram / cabecera X / vertical TikTok, tú eliges). Reportes semanales / OKRs / dashboards kanban viven en Live Artifact, conectados a Notion / Linear / Slack ── publica una vez, refresca para siempre.

## 🚀 Getting started

Tres formas, elige la que encaje:

### 1️⃣ Descarga la app de escritorio (más rápido, configuración cero)

El camino más simple ── instala, abre, y OD detecta automáticamente cada Coding Agent ya en tu `PATH`. Los proyectos persisten localmente en SQLite.

- Builds de escritorio (macOS Apple Silicon · Windows x64): [open-design.ai](https://open-design.ai/)
- Releases anteriores: [GitHub Releases](https://github.com/nexu-io/open-design/releases)

Ideal para: usuarios solos, diseñadores, PMs que quieren clic y empezar.

### 2️⃣ Despliega en la nube (compartido en equipo)

Empuja la capa web a Vercel, compártela en el equipo, y entrega credenciales BYOK vía variables de entorno. El daemon puede seguir corriendo localmente o en tu propio servidor ── separación limpia front/back.

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/nexu-io/open-design"><img alt="Deploy to Vercel" src="https://img.shields.io/badge/Deploy_to-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  <a href="https://railway.app/new/template?template=https://github.com/nexu-io/open-design"><img alt="Deploy to Railway" src="https://img.shields.io/badge/Deploy_to-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" /></a>
  <a href="../deploy.md"><img alt="Self-host with Docker" src="https://img.shields.io/badge/Self--host-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" /></a>
</p>

Guía completa de despliegue: [`docs/deploy.md`](../deploy.md)

Ideal para: equipos pequeños y startups que quieren biblioteca de assets + design system compartidos sin mantener infra.

### 3️⃣ Despliegue propio desde el código (control total)

Clona el repo y ejecuta el stack completo ── daemon + web + opcional shell Electron ── en tu propia máquina:

```bash
git clone https://github.com/nexu-io/open-design
cd open-design
pnpm install
pnpm tools-dev start
# → http://localhost:3000
```

Quickstart completo: [`QUICKSTART.md`](../../QUICKSTART.md) · Arquitectura y opciones: [`docs/architecture.md`](../architecture.md)

Ideal para: desarrolladores y empresas que necesitan bifurcar, añadir Skills personalizados o conectar un LLM gateway interno.

---

**Documentación más profunda**

| | |
|---|---|
| 📐 [Architecture](../architecture.md) | daemon · parsing de protocolo · proxy BYOK |
| 🧠 [Philosophy](../philosophy.md) | Modo Junior-Designer · auto-crítica de 5 dimensiones · anti-AI-slop |
| 🤖 [Agents](../agents.md) | 16 CLIs en detalle |
| 🎨 [Design Systems](../design-systems.md) | 129 sistemas listos para usar |
| 🛠️ [Skills](../../skills/) | el catálogo de 31 Skills |

## 🗺️ Roadmap

### ✅ Lanzado

- **🏠 Home** — biblioteca de assets (My Design / Templates / Brand Systems)
- **🎨 Studio** — cuatro puntos de entrada (Prototype / Slides / Media / Import); Chat + gestión de archivos + Sketch + Preview en sandbox; Editor con Tweaks · Comment · Present; exportación HTML/PDF/PPT/ZIP/MD
- **⚙️ Setting** — Execute Mode (Harness / BYOK), 14 Media Providers, Composio Connector, Skills + MCP integrados, personalización

### 🟡 En curso

- **🎨 Studio** — Live Artifact (Beta); Edit · Draw · Voice editing del Editor
- **⚙️ Setting** — Memory (memoria personal, reutilización entre proyectos); Coding Plan

### 🚧 Planeado

- **🎨 Studio** — Handoff to Coding Agent (último km diseño→código)
- **👭 Organization** — Workspace; Skill & Memory a nivel equipo; permisos de proyecto en 4 niveles (View / Comment / Edit / Private)

> ¿Tienes feedback de prioridades? Cuéntanos en [Issues](https://github.com/nexu-io/open-design/issues) o [Discord](https://discord.gg/qhbcCH8Am4).

## 🤝 Contributing

Damos la bienvenida a todo tipo de contribuciones ── nuevos Skills, nuevos Design Systems, correcciones de bugs, traducciones.

- Flujo Fork & PR: [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Añadir un Skill: suelta una carpeta en [`skills/`](../../skills/) y reinicia el daemon ── ver [`docs/skills-protocol.md`](../skills-protocol.md)
- Añadir un Design System: escribe un `DESIGN.md` y ponlo bajo [`design-systems/`](../../design-systems/)
- Bugs / solicitudes: [GitHub Issues](https://github.com/nexu-io/open-design/issues)

## 💬 Community

- 💭 [Discord](https://discord.gg/qhbcCH8Am4) ── discusión diaria, intercambio de Skills, hilos de ayuda
- 🐦 [@nexudotio](https://x.com/nexudotio) ── actualizaciones del producto
- 🌟 Si te gusta Open Design, déjanos una Star ── ayuda mucho.

## 👥 Contributors

Gracias a todos los que hacen avanzar Open Design ── a través de código, documentación, Skills, Design Systems o un Issue agudo. El muro de abajo es la forma más directa de decir *gracias*.

<a href="https://github.com/nexu-io/open-design/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nexu-io/open-design&max=500&columns=18&anon=0&cache_bust=2026-05-08" alt="Open Design contributors" />
</a>

<br/>

¿Es tu primer PR? Bienvenido. Las etiquetas [`good-first-issue` / `help-wanted`](https://github.com/nexu-io/open-design/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2C%22help+wanted%22) son la entrada.


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

Open Design es una etapa más de un relevo de código abierto. Funciona gracias al trabajo previo ── los proyectos de estos autores forman directamente la base de OD:

<table>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://www.anthropic.com/"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://www.anthropic.com/"><b>Anthropic</b></a><br/>
  <sub><a href="https://www.anthropic.com/news/claude-design">Claude Design</a></sub><br/>
  <sub>El producto cerrado al que este repo provee una alternativa abierta ── origen del modelo mental artifact-first.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/alchaincyf"><img src="https://github.com/alchaincyf.png" width="64" height="64" style="border-radius:50%" alt="alchaincyf" /></a><br/>
  <a href="https://github.com/alchaincyf"><b>@alchaincyf</b> (Hua Shu)</a><br/>
  <sub><a href="https://github.com/alchaincyf/huashu-design"><code>huashu-design</code></a></sub><br/>
  <sub>Núcleo de la filosofía de diseño ── workflow Junior-Designer, protocolo de 5 pasos para activos de marca, anti-AI-slop checklist, auto-crítica de 5 dimensiones.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/op7418"><img src="https://github.com/op7418.png" width="64" height="64" style="border-radius:50%" alt="op7418" /></a><br/>
  <a href="https://github.com/op7418"><b>@op7418</b> (Guizang)</a><br/>
  <sub><a href="https://github.com/op7418/guizang-ppt-skill"><code>guizang-ppt-skill</code></a></sub><br/>
  <sub>Magazine-web-PPT skill empaquetado verbatim, implementación por defecto del modo Deck, fuente de la cultura de checklists P0/P1/P2.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/multica-ai"><img src="https://github.com/multica-ai.png" width="64" height="64" style="border-radius:50%" alt="multica-ai" /></a><br/>
  <a href="https://github.com/multica-ai"><b>@multica-ai</b></a><br/>
  <sub><a href="https://github.com/multica-ai/multica"><code>multica</code></a></sub><br/>
  <sub>Arquitectura daemon + adapter, detección de agente por escaneo de PATH, visión agent-as-teammate.</sub>
</td>
</tr>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/OpenCoworkAI"><img src="https://github.com/OpenCoworkAI.png" width="64" height="64" style="border-radius:50%" alt="OpenCoworkAI" /></a><br/>
  <a href="https://github.com/OpenCoworkAI"><b>@OpenCoworkAI</b></a><br/>
  <sub><a href="https://github.com/OpenCoworkAI/open-codesign"><code>open-codesign</code></a></sub><br/>
  <sub>La primera alternativa open source a Claude Design ── loop streaming-artifact, preview iframe en sandbox, panel de agente en vivo.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/VoltAgent"><img src="https://github.com/VoltAgent.png" width="64" height="64" style="border-radius:50%" alt="VoltAgent" /></a><br/>
  <a href="https://github.com/VoltAgent"><b>@VoltAgent</b></a><br/>
  <sub><a href="https://github.com/VoltAgent/awesome-design-md"><code>awesome-design-md</code></a></sub><br/>
  <sub>Origen del esquema <code>DESIGN.md</code> de 9 secciones y la ruta de import para 69 product systems.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/farion1231"><img src="https://github.com/farion1231.png" width="64" height="64" style="border-radius:50%" alt="farion1231" /></a><br/>
  <a href="https://github.com/farion1231"><b>@farion1231</b></a><br/>
  <sub><a href="https://github.com/farion1231/cc-switch"><code>cc-switch</code></a></sub><br/>
  <sub>Distribución de skills basada en symlinks entre múltiples agent CLIs ── inspiración e implementación de referencia.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/anthropics"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://github.com/anthropics"><b>@anthropics</b></a><br/>
  <sub><a href="https://docs.anthropic.com/en/docs/claude-code/skills">Claude Code Skills</a></sub><br/>
  <sub>Convención <code>SKILL.md</code> adoptada tal cual ── cualquier skill de Claude Code cae en <code>skills/</code> y funciona.</sub>
</td>
</tr>
</table>

Cada idea, cada línea de código prestada, tiene un autor real detrás. Si te gusta Open Design, por favor dales también una Star ⭐.

## 📄 License

[Apache-2.0](../../LICENSE)

Cuando Anthropic, OpenAI y Google encierran la capacidad más avanzada de diseño con IA tras un muro de pago, el mundo aún necesita otra voz ── **devolver la frontera de la tecnología al escritorio de cada desarrollador, diseñador y creador**.

Esperamos que un día una diseñadora independiente ya no tenga que preocuparse por las cuotas de suscripción, y que un estudiante todavía en la escuela pueda usar las mejores herramientas para crear la primera obra de la que esté verdaderamente orgulloso.

> **Take it. Build with it. Make it yours.**

[cd]: https://www.anthropic.com/news/claude-design
