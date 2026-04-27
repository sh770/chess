# AGENTS.md

## Project Type
Static HTML + vanilla JS (no build tools, no dependencies)

## Key Conventions
- Language: Hebrew (RTL) - `lang="he" dir="rtl"` in HTML
- Open `index.html` directly in browser for development
- No test suite - manual testing only

## File Structure
- `index.html` - Entry point (loads game.js)
- `game.js` - Game logic (canvas drawing, area closing detection)

## Development
- No lint/typecheck/test commands
- Modify files directly in any text editor
- Browser dev tools for debugging