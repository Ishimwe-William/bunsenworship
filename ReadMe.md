# BunsenWorship

> **Professional Worship Presentation & Church Media Broadcast Console for Modern Sanctuaries**

[![Build & Release](https://github.com/Ishimwe-William/bunsenworship/actions/workflows/build-and-release.yml/badge.svg)](https://github.com/Ishimwe-William/bunsenworship/actions/workflows/build-and-release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-44.4.2-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Redux Toolkit](https://img.shields.io/badge/Redux%20Toolkit-2-764ABC?logo=redux&logoColor=white)](https://redux-toolkit.js.org/)

**BunsenWorship** is a modern, high-performance desktop application engineered for church production teams, worship leaders, and media technicians. Built with Electron, React 19, TypeScript, and Vite, it delivers ultra-low latency slide control, video and lyric projections, multi-screen output management, bilingual localization, background auto-updates, and an expandable pro-grade operator console.

---

## Key Highlights

- **Multi-OS Installer Generation**: Automated GitHub Actions CI workflow produces ready-to-install packages for **Windows** (`.exe`, `.nupkg`, `.zip`), **macOS** (`.dmg`, `.zip`), and **Linux** (`.deb`, `.rpm`).
- **Silent Background Auto-Updates**: Seamless updates via `update-electron-app` and GitHub Releases. When a new version is released, it downloads in the background and applies instantly with **no confirmation required**.
- **Branded Startup Experience**: Fast splash screen with animated branding, smooth window transitions, and window geometry/state persistence across app launches.
- **System Tray Integration**: Background tray menu with quick-access controls for toggling console visibility, window restoration, and safe shutdown.
- **Pro Broadcast Operator Console**: Dedicated screens for *Live Show*, *Media Library*, *Integrations*, *Outputs*, *Remotes*, and *Settings*.
- **Expandable / Collapsible Pro Sidebar**: Compact mode for maximum viewport space and expanded mode with full labels, active indicator bars, and user session controls.
- **Complete Authentication Flow**: Sign In, Sign Up, 6-digit PIN verification, Forgot Password, and Reset Password with Google Sign-In and universal email support.
- **Zero-Emoji SVG Iconography**: Clean, crisp SVG vector icons throughout the interface for a refined, professional broadcast aesthetic.
- **Bilingual Localization (EN / RW)**: Real-time language switching between English and Kinyarwanda (*Ikinyarwanda*) powered by typed Redux state.
- **Modular Theme Engine**: Pure CSS custom properties supporting **Dark**, **Light**, and **System** themes with automatic persistence and zero style runtime overhead.
- **Sanctuary Projection Monitor**: Visual preview displaying audience display status (`OUTPUT 1: 4K AUDIENCE SANCTUARY`), live lyric cards, and active stage badges.

---

## Screenshots & Architecture Overview

```
+----------------------------------------------------------------------------------------------------+
|                                         BunsenWorship                                              |
+----------------------+-----------------------------------------------------------------------------+
|  [Logo] BunsenWorship|  BunsenWorship / Live Show Console                   [● ON AIR]  [EN|RW] [☀] |
+----------------------+-----------------------------------------------------------------------------+
|  ▶ Live Show (Active)|  +-------------------------------------+  +--------------------------------+ |
|  📁 Media Library    |  | CURRENT SLIDE: 4K MAIN AUDIENCE     |  | QUICK ACTION CONTROLS          | |
|  🔌 Integrations     |  | "Your presence is heaven to me,     |  | [⬛ Black Screen] [Clear Text] | |
|  🖥️ Outputs          |  |  Lord, your glory fills the temple." |  | [Logo] [Next Slide] [Take Live]| |
|  📱 Remotes          |  +-------------------------------------+  +--------------------------------+ |
|  ⚙️ Settings         |  | SECTION QUEUE: Verse 1 | Chorus | Verse 2 | Bridge | Chorus 2            | |
|                      |  +-------------------------------------------------------------------------+ |
|  ------------------  |                                                                             |
|  [👤] Minister Jean  |                                                                             |
|  [->] Sign Out       |                                                                             |
+----------------------+-----------------------------------------------------------------------------+
```

---

## Core Features

### 1. Worship Presentation & Live Show
- **Quick Action Controls**:
  - `Black Screen`: Instantly black out projection screens during prayer or transitions.
  - `Clear Text`: Drop lyrics and scripture while retaining video/image background loops.
  - `Show Logo`: Return screens to the church or ministry branding graphic.
  - `Next Slide`: Advance verses and choruses with hotkey support.
  - `Take Live`: Push previewed content straight to active sanctuary outputs.
- **Dynamic Slide Queue**: Group songs and scriptures by liturgical sections (*Verse 1*, *Chorus*, *Verse 2*, *Bridge*, *Outro*).

### 2. Multi-Screen Output Management
- Configurable output routing for:
  - **Audience Displays**: Ultra-HD 4K / 1080p sanctuary projectors and LED walls.
  - **Stage Confidence Monitors**: High-contrast, inverted lyrics, clocks, and stage timers for singers and speakers.
  - **Live Stream Overlays (NDI / SDI / Alpha Channel)**: Lower-third lyric generation for OBS, vMix, and ATEM switchers.

### 3. Silent Auto-Updates & CI/CD
- **Zero-Confirmation Updates**: Downloaded updates restart and apply automatically in the background without interrupting worship operators with confirmation modals.
- **Cross-Platform Matrix CI**: GitHub Actions automatically builds and uploads installable files for Windows, macOS, and Linux on every master push and release tag.
- **Publishing Integration**: Automatically publishes signed releases and assets directly to GitHub Releases upon tag creation (`v*`).

### 4. Comprehensive Authentication Suite
- **Universal Email Sign-In**: Open to all domains (`@gmail.com`, `@outlook.com`, `@icloud.com`, `@yahoo.com`, or `@churchdomain.org`).
- **Registration**: Clean registration without unnecessary mandatory fields.
- **6-Digit PIN Verification**: Auto-advancing boxes with digit formatting, paste detection, backspace navigation, countdown timers, and demo auto-fill (`123456`).
- **Forgot & Reset Password**: Full recovery cycle allowing ministers to request a reset PIN and immediately configure a new secure password.
- **Google Sign-In**: Streamlined one-click authentication.
- **Demo Quick-Access**: Instant one-click sign-in for stage tests and rehearsal demos.

### 5. Bilingual Localization (English & Kinyarwanda)
- Real-time language switching without page reloads.
- 100% typed translation dictionaries for:
  - Navigation tabs and console actions.
  - Live show triggers and stage monitors.
  - Complete authentication screens, error messages, and validation notices.
  - System and performance settings.

### 6. Modular Redux State Management
- Architecture organized into distinct, isolated domain slices:
  - `src/store/features/theme`: Theme mode (`dark`, `light`, `system`), resolved colors, and DOM attribute bindings.
  - `src/store/features/language`: Active locale (`en`, `rw`), translation dictionaries, and formatting helpers.
  - `src/store/features/navigation`: Active console tab (`live-show`, `media-library`, `integrations`, `outputs`, `remotes`, `settings`) and sidebar expansion state.
  - `src/store/features/auth`: User credentials, authentication status, pending PIN verification, password reset tokens, and session persistence.
  - `src/store/features/presentation`: Live broadcast state, blackout mode, logo overlay, and active slide queue.

---

## Supported Installers & Operating Systems

| Operating System | Package Formats | Target Architectures |
|:---|:---|:---|
| **Windows** | Squirrel Installer (`.exe`), NuGet (`.nupkg`), `.zip` | `x64` |
| **macOS** | Apple Disk Image (`.dmg`), Compressed Archive (`.zip`) | `x64`, Apple Silicon / Universal |
| **Linux** | Debian (`.deb`), Red Hat / Fedora (`.rpm`) | `x64` |

---

## Tech Stack

| Technology | Version | Purpose |
|:---|:---|:---|
| **Electron** | `^44.4.2` | Cross-platform desktop application runtime |
| **React** | `^19.3.0` | Declarative user interface library |
| **TypeScript** | `^5.9.3` | End-to-end static type safety |
| **Vite** | `^5.4.21` | High-speed frontend tooling and bundler |
| **Electron Forge** | `^7.11.2` | Packaging, making installers, and native integration |
| **Redux Toolkit** | `^2.12.0` | Predictable state container and modular feature slices |
| **update-electron-app** | `^3.3.0` | Background update orchestration with auto-restart |
| **CSS Custom Properties** | Native | Zero-dependency styling system with instantaneous theme transitions |

---

## Project Structure

```
bunsenworship/
├── .github/
│   └── workflows/
│       └── build-and-release.yml   # Multi-OS CI/CD pipeline (Windows, macOS, Linux)
├── scripts/
│   └── generate-icons.js           # Multi-resolution icon & favicon generator
├── forge.config.ts                 # Electron Forge config (Makers, Publishers, Fuses, Vite)
├── vite.main.config.ts             # Vite configuration for Electron main process
├── vite.preload.config.ts          # Vite configuration for Electron preload script
├── vite.renderer.config.ts         # Vite configuration for React renderer
├── package.json                    # Project metadata, scripts, and dependencies
├── tsconfig.json                   # TypeScript compiler options
├── src/
│   ├── main.ts                     # Main process: window lifecycle, tray, and splash
│   ├── updater.ts                  # Background silent auto-updater (no confirmation)
│   ├── splash.ts                   # Branded animated splash screen window
│   ├── windowState.ts              # Window coordinate & dimension persistence
│   ├── preload.ts                  # Secure Electron IPC preload bridge
│   ├── renderer.tsx                # React application root mounting point
│   ├── App.tsx                     # Root layout, navigation router, and authentication guard
│   ├── App.css                     # Global console layouts, header, topbar, and screen scroll styles
│   │
│   ├── assets/                     # Application icons (.ico, .icns, PNG sizes 16-512)
│   │   ├── icon.ico                # Windows executable & installer icon
│   │   ├── icon.icns               # macOS bundle icon
│   │   └── AppIcon-*.png           # Multi-resolution icons & system tray assets
│   │
│   ├── components/                 # Modular UI components
│   │   ├── auth/                   # Full authentication suite (Login, Register, PIN, Reset)
│   │   ├── common/                 # Zero-emoji SVG icons & reusable primitives
│   │   ├── language/               # Language switcher & translation hooks
│   │   ├── screens/                # LiveShow, MediaLibrary, Outputs, Settings, etc.
│   │   ├── sidebar/                # Expandable console sidebar & navigation icons
│   │   └── theme/                  # Dark / Light / System theme toggles
│   │
│   ├── store/                      # Redux Toolkit store & feature slices
│   │   ├── index.ts                # Configured Redux store
│   │   ├── hooks.ts                # Typed useAppDispatch & useAppSelector
│   │   └── features/               # Auth, language, navigation, theme, presentation
│   │
│   └── styles/
│       └── theme.css               # CSS variables for Dark, Light, and System modes
```

---

## Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher (LTS recommended)
- **npm**: `v9.x` or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Ishimwe-William/bunsenworship.git
   cd bunsenworship
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch development server:
   ```bash
   npm start
   ```

---

## Available Scripts

| Command | Action |
|:---|:---|
| `npm start` | Launches the Electron application in development mode with Vite hot module replacement (HMR). |
| `npm run lint` | Runs ESLint across all TypeScript and TSX files. |
| `npx tsc --noEmit` | Runs the TypeScript compiler to verify static type integrity. |
| `npm run package` | Builds and packages the application for the local platform (Windows, macOS, Linux). |
| `npm run make` | Generates distributable platform installers (`.exe`, `.dmg`, `.deb`, `.rpm`, `.zip`). |
| `npm run publish` | Builds, packages, and publishes installers directly to GitHub Releases. |
| `npm run generate:icons` | Generates `.ico`, `.icns`, and multi-size PNG icon assets from SVG source. |
| `npm run release` | Bumps patch version (`1.0.1` -> `1.0.2`), commits, tags, and pushes with tags to trigger CI release. |
| `npm run release:minor` | Bumps minor version (`1.0.1` -> `1.1.0`), commits, tags, and pushes with tags to trigger CI release. |
| `npm run release:major` | Bumps major version (`1.0.1` -> `2.0.0`), commits, tags, and pushes with tags to trigger CI release. |

---

## Releasing & Continuous Delivery

### One-Command Release Workflow
Easily cut and publish new releases using the release scripts:

```bash
# Patch release (e.g. 1.0.1 -> 1.0.2)
npm run release

# Minor feature release (e.g. 1.0.1 -> 1.1.0)
npm run release:minor

# Major breaking release (e.g. 1.0.1 -> 2.0.0)
npm run release:major
```

When you execute any release command, it automatically:
1. Bumps `version` in `package.json` and `package-lock.json`.
2. Creates a git commit with the new version.
3. Creates a git tag (`vX.Y.Z`).
4. Pushes the branch and tags to GitHub (`git push && git push --tags`).
6. Triggers GitHub Actions to build Windows, macOS, and Linux installers and publish them directly to GitHub Releases.
7. Any installed clients silently update to the new version in the background without user confirmation prompts.

---

## Security & Architecture Principles

1. **Context Isolation**: Renderer and main processes are separated via `contextBridge` in [`src/preload.ts`](src/preload.ts).
2. **Electron Fuses**: Configured in [`forge.config.ts`](forge.config.ts) to disable `runAsNode`, enforce ASAR integrity validation, and prevent arbitrary Node CLI execution.
3. **Pure CSS Performance**: No bulky CSS-in-JS runtimes or heavy utility frameworks. The UI relies strictly on CSS variables defined in [`src/styles/theme.css`](src/styles/theme.css), ensuring smooth 60 FPS transitions during live church services.
4. **Resilient Window Management**: Splash window safely disposes upon main window readiness; main window bounds are saved to disk on resize/move.

---

## Author & License

- **Author**: William Ishimwe ([ishimwe.william2000@gmail.com](mailto:ishimwe.william2000@gmail.com))
- **Organization**: [BunsenPlus](https://github.com/Ishimwe-William)
- **License**: Licensed under the [MIT License](LICENSE).
