# Chinese Character Input Issue Analysis

## Problem Identified

The user reported: "只有在我輸入中文字的那一瞬間當掉了" (crashes specifically when typing Chinese characters)

## Root Cause Found

In `src/ui/interactive-input.tsx` line 106:

```typescript
} else if (input && input.length === 1 && !key.ctrl && !key.meta) {
```

**Issue**: This condition assumes all input characters have `length === 1`, but:

1. **Chinese characters are multibyte UTF-8**: A single Chinese character like "中" has `length === 1` in JavaScript strings (correct), but during input method composition, intermediate states may have different lengths
2. **Input method composition process**: When typing Chinese, there's a composition process where partial input appears before the final character
3. **String manipulation with cursors**: The cursor position logic doesn't account for multibyte character handling properly

## Additional Issues Found

1. **Cursor position with multibyte chars**: 
   ```typescript
   setCustomValue(
     (prev) =>
       prev.slice(0, cursorPosition) + input + prev.slice(cursorPosition),
   );
   setCursorPosition((prev) => prev + 1);
   ```
   This assumes each character advances cursor by 1, but doesn't account for composition states.

2. **Character deletion logic**:
   ```typescript
   prev.slice(0, cursorPosition - 1) + prev.slice(cursorPosition)
   ```
   May not properly handle multibyte character boundaries.

## Solution Needed

1. Handle input method composition events properly
2. Improve multibyte character support in cursor positioning
3. Add proper validation for Chinese character input
4. Handle intermediate composition states without crashing