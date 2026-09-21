# BunsenWorship

> **Professional Worship Presentation & Church Media Broadcast Console for Modern Sanctuaries**

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-44.4.2-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Redux Toolkit](https://img.shields.io/badge/Redux%20Toolkit-2-764ABC?logo=redux&logoColor=white)

**BunsenWorship** is a modern, high-performance desktop application engineered for church production teams, worship leaders, and media technicians. Built with Electron, React 19, TypeScript, and Vite, it delivers ultra-low latency slide control, video and lyric projections, multi-screen output management, bilingual localization, and an expandable pro-grade operator console.

---

## Key Highlights

- **Pro Broadcast Operator Console**: Dedicated screens for *Live Show*, *Media Library*, *Integrations*, *Outputs*, *Remotes*, and *Settings*.
- **Expandable / Collapsible Pro Sidebar**: Compact mode for maximum viewport space and expanded mode with full labels, active indicator bars, and user session controls.
- **Complete Authentication Flow**: Sign In, Sign Up, 6-digit PIN verification, Forgot Password, and Reset Password with Google Sign-In and universal email support (any provider: Gmail, Outlook, Yahoo, or custom church domains).
- **Zero-Emoji SVG Iconography**: Clean, crisp SVG vector icons throughout the interface for a refined, professional broadcast aesthetic.
- **Bilingual Localization (EN / RW)**: Real-time language switching between English and Kinyarwanda (*Ikinyarwanda*) powered by typed Redux state.
- **Modular Theme Engine**: Pure CSS custom properties supporting **Dark**, **Light**, and **System** themes with automatic persistence and zero style runtime overhead.
- **Sanctuary Projection Monitor**: Left-side visual preview displaying high-visibility audience display status (`OUTPUT 1: 4K AUDIENCE SANCTUARY`), live lyric cards, and active stage badges.

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
  - `Next Slide`: Seamlessly advance verses and choruses with hotkey support.
  - `Take Live`: Push previewed content straight to active sanctuary outputs.
- **Dynamic Slide Queue**: Group songs and scriptures by liturgical sections (*Verse 1*, *Chorus*, *Verse 2*, *Bridge*, *Outro*).

### 2. Multi-Screen Output Management
- Configurable output routing for:
  - **Audience Displays**: Ultra-HD 4K / 1080p sanctuary projectors and LED walls.
  - **Stage Confidence Monitors**: High-contrast, inverted lyrics, clocks, and stage timers for singers and speakers.
  - **Live Stream Overlays (NDI / SDI / Alpha Channel)**: Lower-third lyric generation for OBS, vMix, and ATEM switchers.

### 3. Comprehensive Authentication Suite
- **Universal Email Sign-In**: Open to all domains (`@gmail.com`, `@outlook.com`, `@icloud.com`, `@yahoo.com`, or `@churchdomain.org`).
- **Registration**: Clean registration without unnecessary mandatory fields.
- **6-Digit PIN Verification**: Auto-advancing boxes with digit formatting, paste detection, backspace navigation, countdown timers, and demo auto-fill (`123456`).
- **Forgot & Reset Password**: Full recovery cycle allowing ministers to request a reset PIN and immediately configure a new secure password.
- **Google Sign-In**: Streamlined one-click authentication.
- **Demo Quick-Access**: Instant one-click sign-in for stage tests and rehearsal demos.

### 4. Bilingual Localization (English & Kinyarwanda)
- Real-time language switching without page reloads.
- 100% typed translation dictionaries for:
  - Navigation tabs and console actions.
  - Live show triggers and stage monitors.
  - Complete authentication screens, error messages, and validation notices.
  - System and performance settings.

### 5. Modular Redux State Management
- Architecture organized into distinct, isolated domain slices:
  - `src/store/features/theme`: Theme mode (`dark`, `light`, `system`), resolved colors, and DOM attribute bindings.
  - `src/store/features/language`: Active locale (`en`, `rw`), translation dictionaries, and formatting helpers.
  - `src/store/features/navigation`: Active console tab (`live-show`, `media-library`, `integrations`, `outputs`, `remotes`, `settings`) and sidebar expansion state.
  - `src/store/features/auth`: User credentials, authentication status, pending PIN verification, password reset tokens, and session persistence.

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
| **CSS Custom Properties** | Native | Zero-dependency styling system with instantaneous theme transitions |

---

## Project Structure

```
bunsenworship/
├── forge.config.ts             # Electron Forge configuration (Vite plugin, fuses, makers)
├── vite.main.config.ts         # Vite configuration for Electron main process
├── vite.preload.config.ts      # Vite configuration for Electron preload script
├── vite.renderer.config.ts     # Vite configuration for React renderer
├── package.json                # Project dependencies and script declarations
├── tsconfig.json               # TypeScript compiler options
├── src/
│   ├── main.ts                 # Electron main process window management & lifecycle
│   ├── preload.ts              # Secure Electron IPC preload bridge
│   ├── renderer.tsx            # React application root mounting point
│   ├── App.tsx                 # Root layout, navigation router, and authentication guard
│   ├── App.css                 # Global console layouts, header, topbar, and screen scroll styles
│   │
│   ├── components/             # Modular UI components
│   │   ├── auth/               # Full authentication suite
│   │   │   ├── AuthContainer.tsx       # Auth split-screen layout & screen router
│   │   │   ├── AuthHero.tsx            # Sanctuary projection preview & 4K badge
│   │   │   ├── LoginForm.tsx           # Email/password login with demo shortcut
│   │   │   ├── RegisterForm.tsx        # Account registration
│   │   │   ├── PinVerificationForm.tsx # 6-digit numeric PIN verification
│   │   │   ├── ForgotPasswordForm.tsx  # Reset request initiation
│   │   │   ├── ResetPasswordForm.tsx   # New password configuration
│   │   │   ├── GoogleSignInButton.tsx  # Google branded OAuth button
│   │   │   └── Auth.css                # Authentication styling & animations
│   │   │
│   │   ├── common/             # Shared primitives & zero-emoji icons
│   │   │   └── Icons.tsx               # SVG icons (Logout, Eye, Key, Sun, Moon, etc.)
│   │   │
│   │   ├── language/           # Language switcher & translation hooks
│   │   │   └── LanguageToggle.tsx      # Segmented EN/RW button group
│   │   │
│   │   ├── screens/            # Application viewports
│   │   │   ├── LiveShowScreen.tsx      # Main live production screen
│   │   │   ├── MediaLibraryScreen.tsx  # Background loops, audio, and slides
│   │   │   ├── IntegrationsScreen.tsx  # CCLI, SongSelect, Planning Center, NDI
│   │   │   ├── OutputsScreen.tsx       # Multi-display routing
│   │   │   ├── RemotesScreen.tsx       # Mobile & tablet remote controls
│   │   │   └── SettingsScreen.tsx      # Hardware acceleration, language, display
│   │   │
│   │   ├── sidebar/            # Console navigation sidebar
│   │   │   ├── Sidebar.tsx             # Expandable/collapsible sidebar component
│   │   │   ├── NavIcons.tsx            # SVG tab icons & BunsenWorship branding logo
│   │   │   └── Sidebar.css             # Transitions, active states & responsive rules
│   │   │
│   │   └── theme/              # Theme switcher controls
│   │       └── ThemeToggle.tsx         # Compact and dropdown theme pickers
│   │
│   ├── store/                  # Redux Toolkit store & feature slices
│   │   ├── index.ts            # Configured Redux store
│   │   ├── hooks.ts            # Typed useAppDispatch & useAppSelector
│   │   └── features/
│   │       ├── auth/           # Authentication state, actions, and selectors
│   │       ├── language/       # Localization state & EN/RW dictionary tables
│   │       ├── navigation/     # Active tab navigation & sidebar collapse state
│   │       └── theme/          # Theme tokens, mode toggle, and DOM sync
│   │
│   └── styles/
│       └── theme.css           # CSS variables for Dark, Light, and System modes
```

---

## Getting Started

### Prerequisites
- **Node.js**: `v18.x` or higher (recommended: `v20+`)
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

---

## Available Scripts

| Command | Action |
|:---|:---|
| `npm start` | Launches the Electron application in development mode with Vite hot module replacement (HMR). |
| `npm run lint` | Runs ESLint across all TypeScript and TSX files. |
| `npx tsc --noEmit` | Runs the TypeScript compiler to verify static type integrity. |
| `npm run package` | Builds and packages the application for the local platform (Windows, macOS, Linux). |
| `npm run make` | Generates distributable platform installers (Squirrel `.exe`, `.deb`, `.rpm`, `.zip`). |
| `npm run publish` | Publishes packaged installers to your configured release provider. |

---

## Testing & Demo Mode

BunsenWorship includes built-in test credentials for rapid inspection:

- **Quick Demo Login**: Click **"Quick Demo Login"** on the Sign In screen to enter immediately as *Senior Worship Director*.
- **Google Sign-In**: Click **"Sign in with Google"** to authenticate via the simulated OAuth provider.
- **PIN Verification**: Use any 6 digits (or click **"Auto-fill PIN: 123456"**) to verify your account or complete a password reset.
- **Language Switch**: Click the **EN / RW** pill toggle in the top-right header at any time to switch between English and Kinyarwanda.

---

## Security & Architecture Principles

1. **Context Isolation**: Renderer and main processes are separated via `contextBridge` in [`src/preload.ts`](file:///D:/dev/electron/bunsenworship/src/preload.ts).
2. **Electron Fuses**: Configured in [`forge.config.ts`](file:///D:/dev/electron/bunsenworship/forge.config.ts) to disable `runAsNode`, enforce ASAR integrity validation, and prevent arbitrary Node CLI execution.
3. **Pure CSS Performance**: No bulky CSS-in-JS runtimes or heavy utility frameworks. The UI relies strictly on CSS variables defined in [`src/styles/theme.css`](file:///D:/dev/electron/bunsenworship/src/styles/theme.css), ensuring smooth 60 FPS transitions during live church services.

---

## Author & License

- **Author**: William Ishimwe ([bunsenplus.org@gmail.com](mailto:bunsenplus.org@gmail.com))
- **Organization**: [BunsenPlus](https://github.com/Ishimwe-William)
- **License**: Licensed under the [MIT License](LICENSE).
