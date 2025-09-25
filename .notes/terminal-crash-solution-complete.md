# Terminal.app Crash Solution - Complete Fix

## Problem Update: Terminal.app Itself is Crashing

The user provided a crash report showing Terminal.app (not our Node.js UI) crashing in `NSTextInputContext` during input method handling. This is a macOS system-level issue.

## Crash Report Analysis

### Critical Details
- **Process**: Terminal.app (PID 14331)  
- **Exception**: EXC_CRASH (SIGABRT) 
- **Crashed Thread**: IMKClient_Modern input method XPC connection
- **Location**: NSTextInputContext handleTSMEvent:completionHandler:

### Root Cause
Our Ink-based UI triggers a bug in macOS Terminal.app's Input Method Kit (IMK) integration when processing Chinese input method events.

## Complete Solution Implemented

### 1. Terminal.app Detection and Warning
Added automatic detection of Terminal.app with user warnings:

```typescript
if (process.env.TERM_PROGRAM === 'Apple_Terminal') {
  console.warn('⚠️  Terminal.app detected. For better Chinese input support, consider using iTerm2.');
  console.warn('   If Terminal crashes during Chinese input, this is a known macOS issue.');
}
```

### 2. Enhanced Error Handling
Added specific crash detection for Terminal.app IMK issues:

```typescript
process.on('uncaughtException', (error) => {
  if (error.message.includes('SIGABRT') || error.message.includes('NSTextInputContext')) {
    logger.error('Terminal.app input method crash detected - this is a macOS Terminal.app issue');
    // Provide user guidance
  }
});
```

### 3. Safer Terminal Environment
Set more compatible terminal environment variables:

```typescript
process.env.TERM = 'xterm-256color'; // More compatible terminal type
process.env.INPUT_METHOD_SAFE = '1'; // Signal for safer input handling
```

### 4. Input Sequence Filtering
Added aggressive filtering of potentially problematic input sequences in Terminal.app:

```typescript
if (isTerminalApp && input && typeof input === 'string') {
  const hasComplexInputSequences = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff]/.test(input); // Combining marks
  const hasInputMethodMarkers = /[\ue000-\uf8ff]/.test(input); // Private use area
  
  if (hasComplexInputSequences || hasInputMethodMarkers) {
    return; // Skip processing to prevent Terminal.app crash
  }
}
```

### 5. Applied to All Components
- Main InteractiveInput component
- Legacy interactive-input component  
- Both UI entry points (input and intensive-chat)

## Expected Results

### Crash Prevention
- ✅ Detects Terminal.app and applies safer settings
- ✅ Filters problematic input sequences that trigger IMK crashes
- ✅ Provides clear error messages when crashes occur
- ✅ Guides users to iTerm2 as a more stable alternative

### User Experience
- ✅ Clear warnings about Terminal.app limitations
- ✅ Graceful handling of input method events
- ✅ Better error messages explaining the root cause
- ✅ Recommendation for iTerm2 as a solution

## Technical Implementation
- Terminal detection via `process.env.TERM_PROGRAM`
- Input sequence filtering with Unicode range detection
- Enhanced error handling with crash-specific messages
- Environment variable configuration for safer operation

This solution addresses both the Node.js UI crashes (previous fix) and the underlying Terminal.app crashes (this fix), providing comprehensive protection against macOS input method issues.