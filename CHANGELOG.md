# Changelog

All notable changes to this fork will be documented in this file.

## [Fork Enhancements] - 2024-05-31

### Added
- **Auto-pause countdown timer**: When users start typing in the interactive input, the countdown timer automatically pauses, giving them time to think and type without pressure
- **Visual pause indicator**: Shows "(Paused)" next to the timer when the countdown is paused
- **Smart resume**: Timer automatically resumes after 2 seconds of inactivity

### Changed
- **Silent logging**: Modified the logger to only write to log files, preventing Node.js debug messages from appearing in the terminal and interfering with the user interface
- **Improved user experience**: Users can now take their time typing responses without worrying about timeouts

### Technical Details
- Used `useRef` instead of `useState` for timeout management to avoid React re-render cycles
- Implemented interaction detection in both `useInput` and `handleInputChange` handlers
- Log files are written to `/tmp/interactive-mcp-logs/dev.log` (or OS temp directory)
- Maintains compatibility with original MCP protocol and all existing features

### Configuration
When adding to Claude Code:
```bash
claude mcp add interactive-pause -- env NODE_ENV=production node /path/to/dist/index.js
```

The `NODE_ENV=production` ensures minimal logging output.