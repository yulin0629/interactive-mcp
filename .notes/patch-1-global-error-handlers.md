# Patch 1: Add Global Error Handlers to UI Files

## For src/commands/input/ui.tsx
Add these lines after the existing imports:

```typescript
// Add global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('UI crashed with error:', error.message);
  // Try to exit gracefully
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection in UI:', String(reason));
  // Continue execution - don't crash on promise rejections
});
```

## For src/commands/intensive-chat/ui.tsx  
Add the same global error handlers after the imports.

## For any UI entry points
Add these error handlers at the very beginning of the file execution to catch crashes from input method switching.