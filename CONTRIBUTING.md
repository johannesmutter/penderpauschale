# Contributing to Pendlerpauschale Rechner

Vielen Dank für Ihr Interesse, zu diesem Projekt beizutragen! 🎉

## 🚀 Wie Sie beitragen können

### Bug Reports
- Verwenden Sie die [GitHub Issues](https://github.com/johannesmutter/penderpauschale/issues)
- Beschreiben Sie das Problem detailliert
- Fügen Sie Screenshots hinzu, wenn möglich
- Geben Sie Browser/OS-Informationen an

### Feature Requests
- Öffnen Sie ein Issue mit dem Label "enhancement"
- Beschreiben Sie den gewünschten Feature detailliert
- Erklären Sie den Nutzen für andere Benutzer

### Code Contributions

#### Setup für Entwicklung
```bash
# Repository forken und klonen
git clone https://github.com/YOUR_USERNAME/penderpauschale.git
cd penderpauschale

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

#### Development Workflow
1. **Branch erstellen**: `git checkout -b feature/amazing-feature`
2. **Änderungen implementieren**
3. **Code testen**: `npm run build && npm run preview`
4. **Formatierung prüfen**: `npm run format`
5. **Linting prüfen**: `npm run lint`
6. **Commits erstellen** (siehe Commit Guidelines)
7. **Push und Pull Request**

#### Commit Guidelines
Wir verwenden [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add holiday calculation for Bavaria
fix: correct tax rate calculation for 2024
docs: update README installation instructions
style: improve mobile responsiveness
refactor: extract calendar logic
test: add unit tests for tax calculations
```

#### Code Style
- **Formatierung**: Prettier (automatisch mit `npm run format`)
- **Linting**: ESLint (automatisch mit `npm run lint`)
- **Naming**: 
  - Variablen/Funktionen: `snake_case`
  - Komponenten: `PascalCase`
  - CSS-Klassen: `kebab-case`

#### Datei-Struktur
```
src/
├── lib/
│   ├── components/ui/    # shadcn-svelte Komponenten
│   └── utils.js         # Utility-Funktionen
├── routes/
│   └── +page.svelte     # Hauptseite
├── app.css              # Globale Styles
└── app.html             # HTML-Template
```

## 🧪 Testing

### Manuelle Tests
Vor jeder Pull Request:
- [ ] Desktop (Chrome, Firefox, Safari)
- [ ] Mobile (iOS Safari, Android Chrome)
- [ ] Alle Steuerjahre (2020-2026) prüfen
- [ ] Feiertage für verschiedene Bundesländer
- [ ] CSV-Export funktional


## 📝 Dokumentation

### Code-Dokumentation
- JSDoc für komplexe Funktionen
- Inline-Kommentare für Geschäftslogik
- README bei größeren Änderungen aktualisieren

### Steuer-Richtlinien
Bei Änderungen an Berechnungslogik:
- Quellen aus offiziellen Dokumenten verlinken
- Gültigkeitszeitraum angeben
- Tests für edge cases hinzufügen

## 🎨 Design Guidelines

### UI/UX Prinzipien
- **Accessibility First**: WCAG 2.1 AA Standards
- **Mobile Responsive**: Mobile-first Ansatz
- **Clarity**: Klare, verständliche Benutzerführung
- **Performance**: Schnelle Ladezeiten

### Farben & Typography
- Geist Font Familie
- TailwindCSS Utility-Klassen
- Konsistente shadcn-svelte Komponenten

## 🔍 Review Process

### Pull Request Checkliste
- [ ] Branch ist aktuell mit `main`
- [ ] Tests bestehen (manuell)
- [ ] Keine Linting-Fehler
- [ ] Dokumentation aktualisiert
- [ ] Screenshots bei UI-Änderungen

### Review Kriterien
- **Funktionalität**: Feature funktioniert wie beschrieben
- **Code Quality**: Lesbar, wartbar, performant
- **Tests**: Angemessene Test-Abdeckung
- **Dokumentation**: Vollständig und verständlich

## 🚀 Release Process

### Versioning
Wir folgen [Semantic Versioning](https://semver.org/):
- `MAJOR`: Breaking Changes
- `MINOR`: Neue Features (rückwärtskompatibel)
- `PATCH`: Bug Fixes

### Deployment
- **Automatisch**: Bei Push zu `main` (Vercel)
- **Staging**: Feature-Branches für Preview

## 🤝 Community

### Code of Conduct
- Freundlich und respektvoll
- Konstruktives Feedback
- Inklusiv und weltoffen

### Kommunikation
- **Issues**: Bug Reports, Feature Requests
- **Discussions**: Allgemeine Fragen, Ideen
- **Discord** (geplant): Community Chat

## 🙏 Anerkennung

Alle Contributor werden automatisch in der README erwähnt. Bedeutende Beiträge werden in Release Notes hervorgehoben.

---

**Fragen?** Öffnen Sie gerne ein Issue oder starten Sie eine Discussion!
