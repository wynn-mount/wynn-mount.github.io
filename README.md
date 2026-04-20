# [Wynn Mount](https://wynn-mount.github.io)

Wynn Mount is a free and open-source web application designed to help Wynncraft players calculate, optimize, and meticulously manage their mount feeding configurations. It features a streamlined, Excel-like interface, real-time stat calculations, and a complete drag-and-drop workflow to ensure you never overflow your mount's stats.

## Features

### Mount Configuration
An Excel-like, fully navigable table interface that allows you to manage multiple mounts simultaneously. You can easily set your current mount levels, define Limit and Max attribute targets, and switch between active mounts with zero friction.

### Live Stat Preview
A dynamic, proportionate visual progress bar that displays your mount's stats in real-time. It intelligently separates "Committed" base stats from "Staged Buffs" and highlights selections, ensuring you always know exactly how close you are to reaching the stat thresholds.

### Material Matrix Editor
Full control over material stat yields. You can customize, update, and validate the precise attribute changes each material tier provides, allowing the application to adapt to any future game updates or custom strategies.

### Drag-and-Drop Kanban Board
A robust workflow board utilizing Pragmatic Drag and Drop to manage your feeding process:
- **Inventory**: Store and group your available materials.
- **Feeder**: Stage materials to see their exact projected yields in the Live Stat Preview.
- **Consumed**: Track recently fed items.
- **Stash**: Permanently archive materials. Moving items to the Stash formally commits their stat yields to the mount and timestamps the action for historical tracking.

## Data Privacy & Storage

Your data belongs entirely to you. Wynn Mount does not require an account, a login, or a remote server. All configurations, mounts, and material presets are stored locally in your browser using **IndexedDB (via Dexie.js)** and **Local Storage**. Your feeding plans remain completely private and never leave your device.

## Tech Stack

This project is built using a modern, highly optimized frontend stack:
- **React 19**: Utilizing the new React Compiler for automatic, zero-dependency memoization.
- **Tailwind CSS v4**: For fast, responsive, and utility-first styling.
- **Jotai**: For flexible, atomic global state management.
- **Dexie.js**: For a robust and reactive IndexedDB wrapper.
- **Pragmatic Drag and Drop (Atlassian)**: For highly performant, accessible, and granular drag-and-drop operations.
- **Vite**: For lightning-fast local development and optimized production builds.

## Development Setup

To run this project locally, follow these steps:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed. We recommend using [Bun](https://bun.sh/) or `npm` for package management.

### Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/wynn-mount/wynn-mount.git
cd wynn-mount
bun install
# or npm install
```

### Running in Development
Start the Vite development server:
```bash
bun run dev
# or npm run dev
```
Navigate to `http://localhost:5173` to view the application.

### Building for Production
To compile and bundle the application for production deployment:
```bash
bun run build
# or npm run build
```
This will generate optimized static files in the `dist` directory.

### Previewing the Production Build
To test the compiled production build locally before deploying:
```bash
bun run preview
# or npm run preview
```

## Roadmap & Future Features
- **Mobile Responsiveness**: Enhancing the Kanban board and configuration tables for smaller screens.
- **Advanced Exporting**: Allowing users to generate and share dynamic visual summaries of their feeding plans.
- **Advanced Solver Heuristics**: Expanding the core optimization algorithm to support variable strategic profiles, allowing users to prioritize different cost metrics or value-based constraints over strict material count minimization.
- **Undo/Redo System**: Adding robust history tracking for complex feeding sessions.

## License
This project is open-source and distributed under the **MIT License**. See the `LICENSE` file for more information. Feel free to fork, modify, and contribute!