# Terminal.app Crash Mitigation Strategy

## Problem Analysis
The crash report shows Terminal.app itself crashing in `NSTextInputContext` when handling input method events. This suggests our Ink-based UI is somehow triggering a bug in Terminal.app's input method integration.

## Potential Causes

### 1. Terminal Raw Mode Conflicts
Ink puts the terminal in raw mode to capture all input. This might interfere with Terminal.app's native input method handling, causing the IMK integration to fail.

### 2. Terminal State Confusion
Our UI might be sending terminal control sequences that put Terminal in a state where input method events can't be handled properly.

### 3. Race Conditions
Multiple input handling mechanisms (Ink's useInput + Terminal's IMK) might be competing, causing the crash.

## Mitigation Strategies

### 1. Terminal Environment Isolation
We can detect and handle problematic terminal configurations:

```typescript
// Detect Terminal.app and set safer modes
if (process.env.TERM_PROGRAM === 'Apple_Terminal') {
  // Use more conservative terminal handling for Terminal.app
  process.env.TERM = 'xterm-256color'; // Safer compatibility mode
  process.env.INPUT_METHOD_SAFE = '1'; // Signal to use safer input handling
}
```

### 2. Input Method Event Isolation
Instead of trying to handle input method events directly, we can:
- Disable direct input method integration
- Use simpler text input mechanisms
- Avoid complex cursor positioning that might confuse IMK

### 3. Alternative Terminal Detection
We can detect Terminal.app crashes and suggest alternatives:

```typescript
// Detect Terminal.app and warn users
if (process.env.TERM_PROGRAM === 'Apple_Terminal') {
  console.warn('⚠️  Terminal.app detected. For better Chinese input support, consider using iTerm2.');
  console.warn('   Download: https://iterm2.com/');
}
```

### 4. Graceful Degradation
If Terminal.app crashes are detected, we can:
- Fall back to simpler input methods
- Disable advanced UI features that might trigger crashes
- Provide alternative input mechanisms

## Implementation Plan
1. Add Terminal.app detection
2. Use safer terminal control sequences
3. Implement input method crash recovery
4. Add user guidance for better terminal alternatives