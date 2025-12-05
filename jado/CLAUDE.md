# Jado - Development Guidelines

## Hardcore Rules

### UI/UX Standards
- **NEVER use emojis in the UI** - Always use SVG icons instead
- Use Feather Icons or similar clean, minimal icon sets
- Icons should be inline SVG for better control and styling

### Code Quality
- Always use TypeScript strict typing
- Prefer functional components with hooks over class components
- Keep components modular and reusable

### State Management
- Use localStorage for persistence
- Follow the established storage utility patterns
- Auto-save with debouncing (500ms for notes, 1000ms for dumps)

### Notes System
- Current notes are per-category and persist across sessions
- Weekly notes are filed every Sunday automatically
- Subcategory selections are remembered per-category
- Never show notes from one category in another category

### Styling
- Use CSS variables for theming
- Follow the established color scheme (grey tones, blue accents)
- Use smooth transitions and animations (cubic-bezier easing)
- Maintain consistent spacing using CSS variables

## Project Structure

```
jado/
├── src/
│   ├── components/
│   │   ├── NotesPanel.tsx     # Category-based note taking
│   │   ├── CalendarPanel.tsx  # Calendar with events
│   │   └── DumpPanel.tsx      # Unstructured thoughts
│   ├── utils/
│   │   └── storage.ts         # localStorage abstraction
│   ├── types.ts               # TypeScript type definitions
│   ├── App.tsx                # Main app component
│   └── App.css                # Global styles
└── src-tauri/                 # Rust backend (Tauri 2)
```

## Key Features

### Notes Panel
- Three categories: Work, School, Personal
- Subcategories within each category
- Auto-save with debouncing
- Markdown-style bullet points (• and →)
- Keyboard shortcuts:
  - `Cmd+B`: Bold
  - `Cmd+I`: Italic
  - `Cmd+U`: Underline
  - `Cmd+S`: Strikethrough
  - `Tab`: Indent (• → →)
  - `Shift+Tab` or `Shift+Enter`: Outdent
  - `Enter`: New bullet line
- Weekly filing on Sundays

### Calendar Panel
- Week and Month views
- Event types: Task, Meeting, Other, Out of Office
- Out of Office is self-sufficient (only requires date)
- Events can be deleted with slide-in delete button
- Visual indicators for out-of-office days

### Dump Panel
- Unstructured note-taking
- Same bullet and formatting features as Notes Panel
- Weekly filing system

## Development Commands

```bash
npm install          # Install dependencies
npm run tauri dev    # Run development server
npm run tauri build  # Build for production
```
