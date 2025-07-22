# Pendlerpauschale Rechner

Ein präziser und benutzerfreundlicher Rechner für die deutsche Pendlerpauschale (Entfernungspauschale). Berechnen Sie schnell und einfach Ihre steuerlich absetzbaren Fahrtkosten für die Steuererklärung.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue)](https://pendler-pauschale.de)
[![Svelte](https://img.shields.io/badge/Svelte-5-orange)](https://svelte.dev)

## 🚀 Features

- **Präzise Berechnung**: Berücksichtigt alle aktuellen Steuersätze (2021-2026+)
- **Verkehrsmittel-spezifisch**: Unterschiedliche Höchstbeträge für PKW vs. ÖPNV/Fahrrad
- **Flexible Arbeitstage**: Konfigurierbare Wochentage und Feiertage
- **Ausnahmen-Management**: Urlaub, Homeoffice, Krankheit individuell ausschließen
- **Interaktiver Kalender**: Visuelle Darstellung aller Fahrtage
- **CSV-Export**: Detaillierte Aufstellung für die Steuererklärung
- **Responsive Design**: Optimal für Desktop und Mobile
- **Deutsche Feiertage**: Automatische Berücksichtigung aller Bundesländer

## 🛠️ Installation & Setup

### Voraussetzungen
- Node.js 20+ 
- npm oder pnpm

### Lokale Entwicklung

```bash
# Repository klonen
git clone https://github.com/johannesmutter/penderpauschale.git
cd penderpauschale

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Im Browser öffnen: http://localhost:5173
```

### Produktions-Build

```bash
# Build erstellen
npm run build

# Build testen
npm run preview
```

## 💡 Verwendung

1. **Entfernung eingeben**: Kürzeste Strecke zwischen Wohnung und Arbeitsplatz
2. **Steuerjahr wählen**: Automatische Anpassung der Steuersätze
3. **Verkehrsmittel auswählen**: PKW (unbegrenzt) oder ÖPNV/Fahrrad (4.500€ Limit)
4. **Arbeitstage konfigurieren**: Wochentage und Feiertage festlegen
5. **Ausnahmen definieren**: Urlaub, Homeoffice etc. ausschließen
6. **Ergebnis abrufen**: Gesamtbetrag für die Steuererklärung

## 🏗️ Technologie-Stack

### Core Framework
- **[Svelte 5](https://svelte.dev)** - Moderne Web-Framework mit Runes
- **[SvelteKit](https://kit.svelte.dev)** - Full-Stack Svelte Framework
- **[Vite](https://vitejs.dev)** - Schneller Build-Tool

### Styling & UI
- **[TailwindCSS 4](https://tailwindcss.com)** - Utility-First CSS Framework
- **[shadcn-svelte](https://shadcn-svelte.com)** - Kopierbare UI-Komponenten
- **[bits-ui](https://bits-ui.com)** - Headless UI-Primitives
- **[Geist Font](https://vercel.com/font)** - Moderne Variable Fonts

### Funktionalität
- **[dayjs](https://day.js.org)** - Datum/Zeit-Manipulation
- **[date-holidays](https://github.com/commenthol/date-holidays)** - Deutsche Feiertage
- **[phosphor-svelte](https://phosphoricons.com)** - Icon-Bibliothek

### Development Tools
- **[ESLint](https://eslint.org)** - Code-Linting
- **[Prettier](https://prettier.io)** - Code-Formatierung
- **[TypeScript](https://typescriptlang.org)** - Type-Safety

## 📄 Lizenzen & Attributionen

### Projekt-Lizenz
Dieses Projekt steht unter der **MIT License** - siehe [LICENSE](LICENSE) Datei für Details.

### Abhängigkeiten & Tools

| Tool/Resource | License | Usage |
|---------------|---------|--------|
| [Svelte](https://svelte.dev) | MIT | Core Framework |
| [SvelteKit](https://kit.svelte.dev) | MIT | Application Framework |
| [TailwindCSS](https://tailwindcss.com) | MIT | CSS Framework |
| [shadcn-svelte](https://shadcn-svelte.com) | MIT | UI Components |
| [bits-ui](https://bits-ui.com) | MIT | Headless UI Primitives |
| [Geist Font](https://vercel.com/font) | SIL OFL 1.1 | Typography |
| [dayjs](https://day.js.org) | MIT | Date/Time Library |
| [date-holidays](https://github.com/commenthol/date-holidays) | ISC | Holiday Calculation |
| [phosphor-svelte](https://phosphoricons.com) | MIT | Icon Library |
| [Vite](https://vitejs.dev) | MIT | Build Tool |

### Font-Lizenzen
- **Geist & Geist Mono**: [SIL Open Font License 1.1](https://scripts.sil.org/OFL)

### Rechtlicher Hinweis
Die bereitgestellten Steuerberechnungen dienen nur der groben Orientierung. Für rechtsverbindliche Auskünfte konsultieren Sie einen Steuerberater. Es wird keine Gewähr für Richtigkeit übernommen.

## 🤝 Contributing

Beiträge sind willkommen! Bitte beachten Sie:

1. Fork das Repository
2. Erstellen Sie einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Committen Sie Ihre Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffnen Sie eine Pull Request

### Development Guidelines
- Verwenden Sie Conventional Commits
- Testen Sie Änderungen lokal
- Dokumentieren Sie neue Features
- Halten Sie Code sauber und lesbar

## 🚀 Deployment

### Vercel (Empfohlen)
```bash
# Mit Vercel CLI
vercel --prod

# Oder GitHub Integration nutzen
```

### Traditioneller Server
```bash
# Static Build
npm run build
# Upload dist/ Ordner zum Webserver
```

## 📈 Roadmap

- [ ] PDF-Export
- [ ] Sprach-Lokalisierung (EN)

## 🐛 Bug Reports & Feature Requests

- **Issues**: [GitHub Issues](https://github.com/johannesmutter/penderpauschale/issues)
- **Discussions**: [GitHub Discussions](https://github.com/johannesmutter/penderpauschale/discussions)

## 📊 Statistiken

![GitHub stars](https://img.shields.io/github/stars/johannesmutter/penderpauschale)
![GitHub forks](https://img.shields.io/github/forks/johannesmutter/penderpauschale)
![GitHub issues](https://img.shields.io/github/issues/johannesmutter/penderpauschale)

---

*Steuerberatung ersetzt dieser Rechner nicht. Konsultieren Sie bei Unsicherheiten einen Fachmann.*
