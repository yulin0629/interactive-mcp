# Root Cause Analysis

## Primary Issue: AppleScript Terminal Automation + Input Method Switching

The root cause of the Terminal crashes appears to be a known macOS issue where AppleScript-controlled Terminal windows don't properly handle input method switching events.

### Technical Details:
1. **AppleScript Interference**: The current code uses `osascript -e 'tell application "Terminal" to activate'` which puts Terminal under AppleScript control
2. **Input Method Conflicts**: When switching input methods (e.g., English ↔ Chinese/Japanese), the AppleScript-controlled Terminal doesn't receive proper system notifications
3. **Event Loop Conflicts**: The Ink-based UI captures all input events, which may interfere with macOS input method switching

### Evidence in Code:
```typescript
// This is problematic - AppleScript control
const command = `osascript -e 'tell application "Terminal" to activate' -e 'tell application "Terminal" to do script "${escapedNodeCommand}"'`;
```

### Solution Strategy:
1. **Prefer Native Terminal Launch**: Use iTerm2 or native terminal commands instead of AppleScript
2. **Better Input Handling**: Add proper input method change detection
3. **Process Isolation**: Ensure detached processes don't interfere with system events
4. **Graceful Degradation**: Provide fallback methods that avoid AppleScript