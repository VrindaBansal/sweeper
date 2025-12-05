# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jado** is a simple, clean desktop app for organizing thoughts across three main categories: Work, School, and Personal. The focus is on simplicity and ease of use.

### Core Features

1. **Three Main Categories (Tabs)**: Work, School, Personal - each tab displays as a browser-like interface
2. **Quick Bullet Points**: Each category supports simple bullet-point note-taking with optional sub-categorization
3. **Hybrid Calendar System**:
   - Pulls events from Google Calendar (read-only sync)
   - Maintains separate in-app calendar for app-specific events
   - Google Calendar events are visible but not modified
4. **AI-Powered Note Parsing**: OpenAI integration detects temporal information in notes (e.g., "send email by 6pm") and automatically creates in-app calendar events
5. **Clean Design**: Minimalist UI inspired by modern design systems - no clutter, easy to process

### Design Philosophy

- Simplicity is paramount - avoid feature bloat
- Clean, modern aesthetic (reference designs show minimal color palettes, clear typography, ample whitespace)
- Fast and responsive note-taking
- Smart but unobtrusive AI assistance

## Project Structure

- `jado/` - Main Tauri application
  - `src/` - React frontend (TypeScript + Vite)
    - `App.tsx` - Main React component
    - `main.tsx` - React entry point
  - `src-tauri/` - Rust backend
    - `src/lib.rs` - Tauri command handlers and app initialization
    - `src/main.rs` - Application entry point
    - `Cargo.toml` - Rust dependencies
  - `vite.config.ts` - Vite configuration tailored for Tauri

## Development Commands

All commands should be run from the `jado/` directory:

```bash
cd jado
```

### Install Dependencies
```bash
npm install
```

### Development
```bash
npm run dev
# Runs Vite dev server at http://localhost:1420
```

### Build
```bash
npm run build
# Compiles TypeScript and builds Vite bundle
```

### Tauri Development (with native app)
```bash
npm run tauri dev
# Launches the Tauri app with hot reload
```

### Tauri Build (production)
```bash
npm run tauri build
# Creates distributable desktop application
```

## Architecture

### Frontend-Backend Communication

The application uses Tauri's invoke system for frontend-to-backend communication:

- **Frontend**: Uses `@tauri-apps/api/core` to invoke Rust commands
- **Backend**: Rust functions are marked with `#[tauri::command]` and registered in the invoke handler
- **Example**: The `greet` command in `src-tauri/src/lib.rs:3` is invoked from `App.tsx:12`

### Tauri Command Registration

All Tauri commands must be:
1. Defined with `#[tauri::command]` attribute
2. Registered in `tauri::generate_handler![]` in `src-tauri/src/lib.rs:11`
3. Invoked from frontend using `invoke("command_name", { args })`

### Build Configuration

- Vite runs on fixed port 1420 (configured in `vite.config.ts:17`)
- HMR (Hot Module Reload) uses port 1421
- Vite ignores `src-tauri` directory to prevent watch conflicts
- Tauri expects the library name `jado_lib` (defined in `Cargo.toml:14`)

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Rust, Tauri 2
- **External APIs**:
  - Google Calendar API (read-only sync)
  - OpenAI API (intelligent note parsing for calendar events)
- **Plugins**: tauri-plugin-opener (for opening URLs/files)

## Environment Variables

The app requires API credentials stored securely. Never commit these to version control.

- `GOOGLE_CLIENT_ID`: Google Calendar OAuth client ID
- `OPENAI_API_KEY`: OpenAI API key for note parsing

## Data Architecture

### Local Storage
- Notes are stored locally (per category: Work, School, Personal)
- Each note can have subcategories
- In-app calendar events are stored separately from Google Calendar events

### Calendar Integration
- **Google Calendar**: Read-only sync, events displayed but never modified
- **In-app Events**: Created automatically by AI parsing or manually by user
- Both calendar sources merge in the calendar view

### AI Note Parsing
When a user creates a note, OpenAI analyzes the text for temporal information:
- Detects phrases like "by 6pm", "tomorrow", "next Friday"
- Automatically creates in-app calendar events (not synced to Google Calendar)
- User can review and edit AI-suggested events
