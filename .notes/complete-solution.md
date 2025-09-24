# Complete Solution for macOS Input Method Crash Fix

## Problem Summary
When users switch input methods on macOS (e.g., English ↔ Chinese), the interactive React/Ink UI program crashes instead of the Terminal application itself.

## Root Cause  
The `useInput` hooks from Ink receive input method control sequences that they cannot properly parse, causing uncaught exceptions that crash the Node.js process.

## Solution Overview
Three-layer crash prevention approach:

### Layer 1: Process-Level Protection
Add global error handlers to prevent the entire Node.js process from crashing:

```typescript
process.on('uncaughtException', (error) => {
  console.error('UI crashed with error:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', String(reason));
});
```

### Layer 2: Input Event Filtering
Filter problematic input sequences before they can cause crashes:

```typescript
useInput((input, key) => {
  try {
    // Filter control characters
    if (input && /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(input)) {
      return; // Skip processing
    }
    
    // Filter input method switching
    if ((key.ctrl && input === ' ') || (key.meta && input === ' ')) {
      return; // Skip processing  
    }
    
    // Original logic here...
  } catch (error) {
    console.error('Input handling error:', error);
  }
});
```

### Layer 3: React Error Boundaries
Catch React component crashes and provide graceful error UI.

## Implementation Steps
1. Apply Patch 1 to all UI entry points (ui.tsx files)
2. Apply Patch 2 to all components using `useInput`
3. Apply Patch 3 to add error boundaries around input components

## Testing
After applying patches:
1. Start the MCP server
2. Trigger an input request
3. Switch input methods using Ctrl+Space or Cmd+Space
4. The UI should continue functioning without crashing

## Expected Results
- No more crashes when switching input methods
- Graceful error recovery and logging
- UI remains responsive during input method changes