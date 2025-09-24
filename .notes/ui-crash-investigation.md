# Investigation: What Causes the Interactive UI to Crash

Based on the user's clarification and code analysis, here are the most likely causes of the React/Ink UI program crashes:

## Potential Root Causes

### 1. Input Method Event Handling in Ink
- `useInput` hook from Ink may not properly handle input method switching events
- Input method switches can send special character sequences that crash the input parser
- Raw terminal mode conflicts with input method switching

### 2. Character Encoding Issues  
- Input method switching can send non-UTF8 byte sequences
- Ink may not handle multibyte character sequences properly
- Buffer corruption when processing input method control sequences

### 3. React State Corruption
- Input method events might trigger multiple rapid state updates
- Race conditions in React state when handling special key sequences
- Component unmounting during input method switching

### 4. Terminal Raw Mode Conflicts
- Ink puts the terminal in raw mode to capture all input
- Input method switching might interfere with raw mode
- System-level input method events bypass normal terminal input processing

### 5. Uncaught Exceptions
- The UI program might throw uncaught exceptions when processing certain input events
- Missing error boundaries around input handling components
- Synchronous errors in useInput callback functions

## Investigation Approach

1. **Add Error Boundaries**: Wrap components in error boundaries to catch crashes
2. **Improve Input Validation**: Validate and sanitize input before processing
3. **Handle Input Method Events**: Explicitly handle input method switching sequences
4. **Add Debugging**: Log input events to understand what triggers crashes
5. **Graceful Degradation**: Ensure UI can recover from input processing errors

## Most Likely Issue

The `useInput` hook receives input method switching control sequences that it cannot properly parse, causing the Node.js process to crash with an uncaught exception.