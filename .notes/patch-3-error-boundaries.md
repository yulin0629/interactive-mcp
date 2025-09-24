# Patch 3: React Error Boundaries

## Problem  
React components can crash due to state corruption during input method switching.

## Solution
Add error boundaries around input components.

## Create Error Boundary Component
Add this to src/components/InteractiveInput.tsx (or create a separate file):

```typescript
class InputErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React component crashed:', error.message, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box flexDirection="column" padding={1}>
          <Text color="red">
            Input component crashed. Please restart the program.
          </Text>
          <Text color="gray">
            Error: {this.state.error?.message || 'Unknown error'}
          </Text>
        </Box>
      );
    }
    return this.props.children;
  }
}
```

## Wrap Components
Wrap any input components with the error boundary:

```typescript
<InputErrorBoundary>
  <InteractiveInput {...props} />
</InputErrorBoundary>
```