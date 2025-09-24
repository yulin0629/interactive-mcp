# Investigation Notes - macOS Terminal Crash Issue

## Problem Statement
在 macOS 時，常常被呼叫後，開出 terminal 時，在我切換輸入法後，整個  terminal 會當掉，為什麼

Translation: On macOS, when called frequently, after opening terminal, when I switch input method, the entire terminal crashes, why?

## Key Findings from Code Analysis

### Terminal Launch Mechanisms
The codebase uses two methods to launch Terminal on macOS:

1. **Primary Method**: AppleScript with `osascript`
   ```typescript
   const command = `osascript -e 'tell application "Terminal" to activate' -e 'tell application "Terminal" to do script "${escapedNodeCommand}"'`;
   ```

2. **Fallback Method**: Using `.command` files with `open -a Terminal`
   ```typescript
   const openProc = spawn('open', ['-a', 'Terminal', launcherPath], {
     stdio: ['ignore', 'ignore', 'ignore'],
     detached: true,
   });
   ```

### Potential Issues Identified
1. **Input Method Change Handling**: The React components use `useInput` from Ink which captures all keyboard input
2. **AppleScript Automation**: May not handle input method switches gracefully
3. **Terminal Process Management**: Detached processes with ignored stdio might not handle system events properly
4. **Race Conditions**: Multiple terminal windows being opened rapidly

## Investigation Plan
- [x] Research macOS input method switching and Terminal interactions
- [x] Test different terminal launch strategies
- [x] Analyze system event handling in Terminal.app
- [x] Implement safer terminal process management
- [x] Add input method switch event filtering
- [x] Create robust fallback mechanisms
- [x] Test build and linting compliance