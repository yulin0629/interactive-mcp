# Testing Guide for macOS Terminal Crash Fix

## Prerequisites
- macOS system with Terminal.app
- Node.js and npm installed
- Optional: iTerm2 installed (recommended for better input method support)
- Multiple input methods configured (e.g., English + Chinese/Japanese)

## Testing Steps

### 1. Install the Fixed Version
```bash
cd /path/to/interactive-mcp
npm install
npm run build
```

### 2. Test Basic Input Functionality
```bash
# Start the MCP server
npm start

# In another terminal or Claude Desktop, trigger an input request
# The server should open a Terminal window with the UI
```

### 3. Test Input Method Switching
1. **In the opened Terminal UI window**:
   - Switch input methods using `Ctrl+Space` or `Cmd+Space`
   - Try typing in different languages
   - The Terminal should NOT crash or become unresponsive
   
2. **Expected behavior**:
   - Input method switching should work smoothly
   - Terminal remains responsive
   - UI continues to function normally

### 4. Test Multiple Sessions
1. Trigger multiple input requests rapidly
2. Switch input methods in different Terminal windows
3. All windows should remain stable

### 5. Test Different Terminal Apps
If you have iTerm2 installed:
1. The system should prefer iTerm2 automatically
2. Input method switching should be even more stable in iTerm2

## Troubleshooting

### If Terminal Still Crashes
1. Check console logs for error messages
2. Verify iTerm2 is installed and accessible
3. Check system input method configuration
4. Try disabling other terminal-related automation tools

### Log Files
Check these locations for detailed logs:
- Application logs in the MCP server output
- macOS Console.app for system-level errors

## Verification Checklist
- [ ] Terminal opens successfully when MCP requests input
- [ ] Input method switching (Ctrl+Space) doesn't crash Terminal
- [ ] Cmd+Space (Spotlight) works normally
- [ ] Multiple Terminal windows can be opened simultaneously
- [ ] UI responds correctly to different input methods
- [ ] No errors in application or system logs

## Environment Variables
The fixed version sets these environment variables to prevent conflicts:
- `LANG=en_US.UTF-8`
- `LC_ALL=en_US.UTF-8` 
- `__MCP_TERMINAL_LAUNCH=1`
- `__MCP_NO_APPLESCRIPT=1`

You can verify these are set in the Terminal window with: `env | grep MCP`