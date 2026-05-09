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
  <a href="README.ar.md">العربية</a> · <b>Türkçe</b> ·
  <a href="README.uk.md">Українська</a>
</p>

<br/>

> **[Claude Design][cd]'in açık kaynak alternatifi.** Local-first; OpenClaw, Claude Code, Hermes Agent dahil **16 Coding Agent**'ı doğrudan makinende çalıştırır.
>
> **129 marka düzeyinde tasarım sistemi** ── Linear / Stripe / Apple / Notion, tek tıkla değiştir.
>
> **31 Skill** ── Prototype / Live Artifact / Slides / Görüntü / Video / Ses, uçtan uca kapsama.

---

## 📋 What

✨ **Open Design (OD), doğal dili teslime hazır tasarım çıktılarına dönüştüren açık kaynaklı bir çalışma alanıdır.**

📝 Tasarımını tek cümleyle anlat, OD teslim edilebilir prototipler, Live Artifact'ler, Slides, görüntüler, videolar ve ses üretsin ── 🎨 kıdemli bir tasarımcının zanaatıyla, sıradan AI çıktılarının tekdüzeliği değil.

📤 HTML, PDF, PPT, ZIP, Markdown ve daha fazla formata dışa aktarır.

🤖 **Coding Agent**'lerle çalışır (Claude Code / Codex / Cursor Agent / OpenClaw — sen seç). 📂 Her Skill ve Design System projende sade bir Markdown dosyası ── oku, düzenle, fork'la, paylaş.

💻 **Local-first.** Tüm veri ve runtime tamamen kendi makinende yaşar.

## 💡 Why

🚀 Nisan 2026'da Anthropic [Claude Design][cd]'i yayınladı ve **bir LLM'in gerçekten tasarım yapabildiğini ilk kez gösterdi** ── tasarım *üzerine* makaleler değil, **kullanılabilir gerçek bir tasarım çıktısı** üretti.

🔒 Ama **kapalı kaynak, ücretli, sadece bulutta** kaldı ve Anthropic'in modellerine kilitlendi. Agent değiştirmek, kendi sunucunda barındırmak, BYOK ── hiçbiri mümkün değildi.

🔓 Open Design aynı yeteneği açar: **modeli sen seç, anahtarları sen tut, her Skill ve Design System'i yerel dosya olarak düzenle** ── tüm sistem kendi donanımında çalışır.

🤝 Yeni bir Agent yapmaya niyetimiz yok. Laptop'undaki Claude Code, Codex ve Cursor Agent zaten yeterli. **OD'nin yaptığı tek şey, onları eksiksiz bir tasarım iş akışına bağlamaktır.**

## 🆚 Difference from other solutions

| | Claude Design | Figma | Lovable / v0 / Bolt | **Open Design** |
|---|---|---|---|---|
| **Açık kaynak** | ❌ | ❌ | ❌ | ✅ Apache-2.0 |
| **Local-first** | ❌ Sadece bulut | ❌ Bulut bağımlı | ❌ Sadece bulut | ✅ Daemon + masaüstü uygulaması |
| **Agent** | Sadece Anthropic | Make-mode kilitli | Vendor kilitli | ✅ 16 CLI, sen seç |
| **BYOK** | ❌ | ❌ | Kısmen | ✅ Anthropic / OpenAI / Azure / Google |
| **Marka sistemleri** | Yerleşik, sabit | Takım kütüphaneleri (özel) | Theme JSON | ✅ 129 Markdown sistem, tamamen özelleştirilebilir |
| **Skill genişletme** | Kapalı kaynak | Plugin marketplace (denetimli) | Kapalı kaynak | ✅ Klasör bırak, tamam |
| **Senaryolar** | Genel tasarım | UI / prototip / işbirliği | Koda yönelik prototipler | ✅ Tasarım / pazarlama / ops / ürün / finans / İK |

## 🖼️ Demo

Dört temel çıktı türü:

### 📐 Prototype

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/gamified-app.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/gamified-app"><code>gamified-app</code></a> · Oyunlaştırılmış mobil prototip ── üç kareli koyu sahne + XP çubukları + görev kartları</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><img src="https://raw.githubusercontent.com/nexu-io/open-design/main/docs/screenshots/skills/social-carousel.png" width="380"/></a><br/><sub><a href="https://github.com/nexu-io/open-design/tree/main/skills/social-carousel"><code>social-carousel</code></a> · Sosyal carousel ── üç adet 1080×1080 kart, başlıklar bağlanır</sub></td>
</tr>
</table>

### 🎞️ Slide

<table>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/kami-deck.png" width="380"/><br/><sub><b>Kami Deck</b> ── "Designing intelligence on warm paper", dergi tarzı kapak</sub></td>
<td width="50%"><img src="https://raw.githubusercontent.com/nexu-io/open-design/chore/zh-cn-readme-trim-byok-fallback/docs/screenshots/decks/open-design-landing-deck.png" width="380"/><br/><sub><b>Open Design Landing Deck</b> ── landing-page tarzı sunum</sub></td>
</tr>
</table>

### 🖼️ Görüntü

<table>
<tr>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/3d-stone-staircase-evolution-infographic.json"><img src="https://cms-assets.youmind.com/media/1776661968404_8a5flm_HGQc_KOaMAA2vt0.jpg" width="380"/></a><br/><sub><b>3D Stone Staircase Evolution Infographic</b> ── üç adımlı, oyma taş estetiğinde infografik</sub></td>
<td width="50%"><a href="https://github.com/nexu-io/open-design/blob/main/prompt-templates/image/profile-avatar-glamorous-woman-in-black-portrait.json"><img src="https://cms-assets.youmind.com/media/1777453184257_vb9hvl_HG9tAkOa4AAuRrn.jpg" width="380"/></a><br/><sub><b>Glamorous Woman in Black Portrait</b> ── editöryel stüdyo portresi</sub></td>
</tr>
</table>

### 🎬 Video

<table>
<tr>
<td width="50%"><a href="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/downloads/default.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7e8983364a95fe333f0f88bd1085a0e8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Luxury Supercar Cinematic</b> ── anlatımlı ürün filmi, MP4 oynatmak için tıkla</sub></td>
<td width="50%"><a href="https://github.com/YouMind-OpenLab/awesome-seedance-2-prompts/releases/download/videos/1402.mp4"><img src="https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com/7f63ad253175a9ad1dac53de490efac8/thumbnails/thumbnail.jpg" width="380"/></a><br/><sub><b>Japanese Romance Short Film</b> ── 15 saniyelik Seedance 2.0 anlatımı</sub></td>
</tr>
</table>

## 🎯 Use cases

### 🎨 Tasarımcılar

**Bugün:** Figma'da kare kare çalışmak, marka rehberiyle defalarca hizalamak, sonra mühendisliğe teslim etmek. Marka değiştiğinde her dosya elle senkronlanır.

**Acı:** İlk taslaklar sonsuza kadar sürer, marka değişimi bileşen bileşen düzenleme demektir, ve tasarım ile mühendislik tek bir doğruluk kaynağı paylaşmaz.

**OpenDesign:** Yapıyı bir prompt'la anlatmak yerine canvas'ta çiz ── agent çizimden kod düzeyinde prototipler üretir. Design System değiştirmek paleti, tipografi ve aralıkları otomatik değiştirir. Çift hatlı yorumlar "kendime not"u "agent'a talimat"tan ayırır. Sonuçtaki HTML hem tasarım hem mühendislik çıktısıdır.

---

### 📋 Ürün yöneticileri

**Bugün:** Notion'da PRD → Figma'da wireframe → Keynote'ta sunum → üç dokümanı elle uzlaştır.

**Acı:** Üç araç, sürekli senkronsuz. Yönetime "canlı demo" göstermek mühendisliği beklemek demek.

**OpenDesign:** Doğal dilden PM Spec dokümanı (TOC + karar kütüğü ile) doğrudan üretilir; bir cümleyle dergi tarzı seed-round pitch deck; Live Artifact Notion / Linear'dan gerçek veriyi çeker, çalışan ürün demosu beş dakikada hazır.

---

### 💻 Mühendisler

**Bugün:** v0 / Bolt ile prototip başlatma ── ama model ve anahtar onların bulutuna kilitli, takımın Skill'ini özel repoya fork'lamak imkansız.

**Acı:** Veri perimetreden çıkar, token harcaması öngörülemez, uzantılar platforma takılır, tasarım→kod aktarımı insan çevirisine dönüşür.

**OpenDesign:** BYOK ile kendi LLM gateway'ine bağlan, her proje yerel SQLite'ta. Bir Skill sadece `SKILL.md` + `assets/` ── klasörü `skills/`'e bırak, tamam. "Handoff to Coding Agent" tasarımı Cursor / Claude Code'a tam bağlamla aktarır.

---

### 📣 Pazarlama & ops

**Bugün:** Her kampanya tasarım kapasitesi ister. Instagram / X / TikTok için boyutlandırma her platforma elle kırpma demek.

**Acı:** Tasarımı bekle, her metin / renk değişikliği yeniden yapım, ve haftada 50 kart insanların kaldırabileceğinin üstünde.

**OpenDesign:** Tek bir prompt yan yana altı sosyal kart varyantı üretir (Instagram kapağı / X header / TikTok dikey ── seç). Haftalık raporlar / OKR'ler / kanban dashboard'lar Live Artifact üzerinde, Notion / Linear / Slack'e bağlı ── bir kez yayımla, sonsuza kadar tazelensin.

## 🚀 Getting started

Üç yol, sana uyanı seç:

### 1️⃣ Masaüstü uygulamasını indir (en hızlı, sıfır yapılandırma)

En basit yol ── kur, aç, OD `PATH`'teki her Coding Agent'ı otomatik algılasın. Projeler yerel SQLite'ta saklanır.

- Masaüstü build'leri (macOS Apple Silicon · Windows x64): [open-design.ai](https://open-design.ai/)
- Önceki sürümler: [GitHub Releases](https://github.com/nexu-io/open-design/releases)

Şuna uygun: bireysel kullanıcılar, tasarımcılar, PM'ler ── tıklayıp başlamak isteyenler.

### 2️⃣ Buluta tek tıkla deploy (takım paylaşımlı)

Web katmanını Vercel'a it, takımla paylaş, BYOK kimlik bilgilerini env değişkenleriyle gönder. Daemon hâlâ yerelde veya kendi sunucunda çalışabilir ── temiz front/back ayrımı.

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/nexu-io/open-design"><img alt="Deploy to Vercel" src="https://img.shields.io/badge/Deploy_to-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  <a href="https://railway.app/new/template?template=https://github.com/nexu-io/open-design"><img alt="Deploy to Railway" src="https://img.shields.io/badge/Deploy_to-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" /></a>
  <a href="../deploy.md"><img alt="Self-host with Docker" src="https://img.shields.io/badge/Self--host-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" /></a>
</p>

Tam deploy kılavuzu: [`docs/deploy.md`](../deploy.md)

Şuna uygun: paylaşımlı varlık kütüphanesi + tasarım sistemi isteyen ama altyapı yönetmek istemeyen küçük takımlar ve startup'lar.

### 3️⃣ Kaynaktan self-host (tam kontrol)

Repoyu klonla ve tam yığını ── daemon + web + opsiyonel Electron shell ── kendi makinende çalıştır:

```bash
git clone https://github.com/nexu-io/open-design
cd open-design
pnpm install
pnpm tools-dev start
# → http://localhost:3000
```

Tam Quickstart: [`QUICKSTART.md`](../../QUICKSTART.md) · Mimari & seçenekler: [`docs/architecture.md`](../architecture.md)

Şuna uygun: fork'lamak, özel Skill eklemek veya iç LLM gateway'ine bağlamak isteyen geliştiriciler ve kurumlar.

---

**Daha derin dokümantasyon**

| | |
|---|---|
| 📐 [Architecture](../architecture.md) | daemon · protokol parse · BYOK proxy |
| 🧠 [Philosophy](../philosophy.md) | Junior-Designer modu · 5-boyutlu öz-eleştiri · anti-AI-slop |
| 🤖 [Agents](../agents.md) | 16 CLI ayrıntılı |
| 🎨 [Design Systems](../design-systems.md) | 129 hazır sistem |
| 🛠️ [Skills](../../skills/) | 31 Skill kataloğu |

## 🗺️ Roadmap

### ✅ Yayında

- **🏠 Home** — varlık kütüphanesi (My Design / Templates / Brand Systems)
- **🎨 Studio** — dört giriş noktası (Prototype / Slides / Media / Import); Chat + dosya yönetimi + Sketch + sandbox Preview; Editor'de Tweaks · Comment · Present; HTML/PDF/PPT/ZIP/MD dışa aktarma
- **⚙️ Setting** — Execute Mode (Harness / BYOK), 14 Media Provider, Composio Connector, yerleşik Skill + MCP, kişiselleştirme

### 🟡 Devam ediyor

- **🎨 Studio** — Live Artifact (Beta); Editor'de Edit · Draw · Voice editing
- **⚙️ Setting** — Memory (kişisel hafıza, projeler arası yeniden kullanım); Coding Plan

### 🚧 Planlanan

- **🎨 Studio** — Handoff to Coding Agent (tasarım→kod son kilometre)
- **👭 Organization** — Workspace; takım düzeyinde Skill & Memory; proje düzeyinde 4 kademe izin (View / Comment / Edit / Private)

> Önceliklere dair geri bildirimin var mı? [Issues](https://github.com/nexu-io/open-design/issues) veya [Discord](https://discord.gg/qhbcCH8Am4)'ta bize anlat.

## 🤝 Contributing

Her tür katkıyı memnuniyetle karşılıyoruz ── yeni Skill'ler, yeni Design System'ler, hata düzeltmeleri, çeviriler.

- Fork & PR akışı: [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Skill ekleme: bir klasörü [`skills/`](../../skills/)'a bırak ve daemon'u yeniden başlat ── bkz. [`docs/skills-protocol.md`](../skills-protocol.md)
- Design System ekleme: bir `DESIGN.md` yaz ve [`design-systems/`](../../design-systems/) altına koy
- Hata / özellik istekleri: [GitHub Issues](https://github.com/nexu-io/open-design/issues)

## 💬 Community

- 💭 [Discord](https://discord.gg/qhbcCH8Am4) ── günlük sohbet, Skill takası, yardım kanalları
- 🐦 [@nexudotio](https://x.com/nexudotio) ── ürün güncellemeleri
- 🌟 Open Design'ı seviyorsan bir Star bırak ── çok yardımı oluyor.

## 👥 Contributors

Open Design'ı ileri taşıyan herkese teşekkürler ── kod, dokümantasyon, Skill, Design System veya keskin bir Issue ile. Aşağıdaki duvar *teşekkür* etmenin en doğrudan yolu.

<a href="https://github.com/nexu-io/open-design/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nexu-io/open-design&max=500&columns=18&anon=0&cache_bust=2026-05-08" alt="Open Design contributors" />
</a>

<br/>

İlk PR'ın mı? Hoş geldin. [`good-first-issue` / `help-wanted`](https://github.com/nexu-io/open-design/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2C%22help+wanted%22) etiketleri giriş noktası.

## ⭐ Star History

<a href="https://star-history.com/#nexu-io/open-design&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=nexu-io/open-design&type=Date" width="640" />
  </picture>
</a>

## 🙏 Built on

Open Design açık kaynaklı bir bayrak yarışının bir etabıdır. Çalışıyor olması, önce gelen çalışmalar sayesinde ── şu yazarların projeleri OD'nin temelini doğrudan oluşturuyor:

<table>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://www.anthropic.com/"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://www.anthropic.com/"><b>Anthropic</b></a><br/>
  <sub><a href="https://www.anthropic.com/news/claude-design">Claude Design</a></sub><br/>
  <sub>Bu reponun açık alternatif sunduğu kapalı ürün ── artifact-first zihinsel modelin kaynağı.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/alchaincyf"><img src="https://github.com/alchaincyf.png" width="64" height="64" style="border-radius:50%" alt="alchaincyf" /></a><br/>
  <a href="https://github.com/alchaincyf"><b>@alchaincyf</b> (Hua Shu)</a><br/>
  <sub><a href="https://github.com/alchaincyf/huashu-design"><code>huashu-design</code></a></sub><br/>
  <sub>Tasarım felsefesinin çekirdeği ── Junior-Designer iş akışı, 5 adımlı marka varlık protokolü, anti-AI-slop checklist, 5-boyutlu öz-eleştiri.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/op7418"><img src="https://github.com/op7418.png" width="64" height="64" style="border-radius:50%" alt="op7418" /></a><br/>
  <a href="https://github.com/op7418"><b>@op7418</b> (Guizang)</a><br/>
  <sub><a href="https://github.com/op7418/guizang-ppt-skill"><code>guizang-ppt-skill</code></a></sub><br/>
  <sub>Magazine-web-PPT skill aynen paketlenmiş, Deck modunun varsayılan uygulaması, P0/P1/P2 checklist kültürünün kaynağı.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/multica-ai"><img src="https://github.com/multica-ai.png" width="64" height="64" style="border-radius:50%" alt="multica-ai" /></a><br/>
  <a href="https://github.com/multica-ai"><b>@multica-ai</b></a><br/>
  <sub><a href="https://github.com/multica-ai/multica"><code>multica</code></a></sub><br/>
  <sub>Daemon + adapter mimarisi, PATH tarayan agent algılama, agent-as-teammate dünya görüşü.</sub>
</td>
</tr>
<tr>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/OpenCoworkAI"><img src="https://github.com/OpenCoworkAI.png" width="64" height="64" style="border-radius:50%" alt="OpenCoworkAI" /></a><br/>
  <a href="https://github.com/OpenCoworkAI"><b>@OpenCoworkAI</b></a><br/>
  <sub><a href="https://github.com/OpenCoworkAI/open-codesign"><code>open-codesign</code></a></sub><br/>
  <sub>Claude Design'a ilk açık kaynak alternatif ── streaming-artifact döngüsü, sandbox iframe önizlemesi, canlı agent paneli.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/VoltAgent"><img src="https://github.com/VoltAgent.png" width="64" height="64" style="border-radius:50%" alt="VoltAgent" /></a><br/>
  <a href="https://github.com/VoltAgent"><b>@VoltAgent</b></a><br/>
  <sub><a href="https://github.com/VoltAgent/awesome-design-md"><code>awesome-design-md</code></a></sub><br/>
  <sub>9 bölümlü <code>DESIGN.md</code> şemasının kaynağı, 69 ürün sisteminin import yolu.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/farion1231"><img src="https://github.com/farion1231.png" width="64" height="64" style="border-radius:50%" alt="farion1231" /></a><br/>
  <a href="https://github.com/farion1231"><b>@farion1231</b></a><br/>
  <sub><a href="https://github.com/farion1231/cc-switch"><code>cc-switch</code></a></sub><br/>
  <sub>Birden fazla agent CLI'da symlink tabanlı skill dağıtımı ── ilham ve referans uygulama.</sub>
</td>
<td width="25%" align="center" valign="top">
  <a href="https://github.com/anthropics"><img src="https://github.com/anthropics.png" width="64" height="64" style="border-radius:50%" alt="Anthropic" /></a><br/>
  <a href="https://github.com/anthropics"><b>@anthropics</b></a><br/>
  <sub><a href="https://docs.anthropic.com/en/docs/claude-code/skills">Claude Code Skills</a></sub><br/>
  <sub><code>SKILL.md</code> sözleşmesi olduğu gibi benimsendi ── herhangi bir Claude Code skill <code>skills/</code>'e bırakılınca çalışır.</sub>
</td>
</tr>
</table>

Her fikrin, ödünç alınan her satır kodun arkasında gerçek bir yazar var. Open Design'ı seviyorsan onlara da bir Star bırak ⭐.

## 📄 License

[Apache-2.0](../../LICENSE)

Anthropic, OpenAI ve Google en gelişmiş AI tasarım yeteneklerini ödeme duvarlarının ardına kilitlediğinde, dünyanın hâlâ başka bir sese ihtiyacı vardır ── **teknolojinin sınırını her geliştiricinin, tasarımcının ve yaratıcının masasına geri getirmek**.

Bir gün bağımsız bir tasarımcının abonelik ücretlerinden endişelenmemesini, hâlâ okula giden bir gencin birinci sınıf araçlarla gerçekten gurur duyabileceği ilk eserini yapabilmesini diliyoruz.

> **Take it. Build with it. Make it yours.**

[cd]: https://www.anthropic.com/news/claude-design
