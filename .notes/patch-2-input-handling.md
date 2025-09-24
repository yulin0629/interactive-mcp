# Patch 2: Improve Input Handling in useInput Callbacks

## Problem
The `useInput` hooks in the UI components crash when receiving input method switching events or control sequences.

## Solution
Wrap all `useInput` callbacks with try-catch blocks and add input validation.

## For src/components/InteractiveInput.tsx
Replace the `useInput` callback with:

```typescript
useInput((input, key) => {
  try {
    // Filter out potentially problematic input sequences
    if (input && typeof input === 'string') {
      // Check for input method control sequences
      const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(input);
      if (hasControlChars) {
        console.debug('Filtered control character sequence');
        return; // Skip processing
      }
    }

    // Filter input method switching key combinations
    if (key.ctrl && input === ' ') {
      console.debug('Input method switch detected, ignoring');
      return;
    }
    
    if (key.meta && input === ' ') {
      console.debug('Cmd+Space detected, ignoring');
      return;
    }

    // Original input handling logic here...
    // [Keep all existing logic but wrap in this try-catch]
    
  } catch (error) {
    console.error('Error in input handling:', error instanceof Error ? error.message : String(error));
    // Continue execution - don't crash
  }
});
```

## For src/ui/interactive-input.tsx
Apply the same pattern:
1. Wrap the entire `useInput` callback in try-catch
2. Add input method event filtering at the beginning
3. Add control character filtering
4. Keep all existing logic but make it crash-safe

## For any other components using useInput
Apply the same crash prevention pattern.