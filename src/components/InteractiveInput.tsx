import React, { FC, useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import logger from '@/utils/logger.js';

interface InteractiveInputProps {
  question: string;
  questionId: string;
  predefinedOptions?: string[];
  onSubmit: (questionId: string, value: string) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export const InteractiveInput: FC<InteractiveInputProps> = ({
  question,
  questionId,
  predefinedOptions = [],
  onSubmit,
  onInteractionStart,
  onInteractionEnd,
}) => {
  const [mode, setMode] = useState<'option' | 'input'>(
    predefinedOptions.length > 0 ? 'option' : 'input',
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>('');
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to handle interaction timing
  const handleInteraction = () => {
    // Clear any existing timeout
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    
    // Notify parent that interaction started
    onInteractionStart?.();
    
    // Set a new timeout to resume after 2 seconds of inactivity
    const timeout = setTimeout(() => {
      onInteractionEnd?.();
    }, 2000);
    
    interactionTimeoutRef.current = timeout;
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  useInput((input, key) => {
    // Any key press counts as interaction
    handleInteraction();
    if (predefinedOptions.length > 0) {
      if (key.upArrow) {
        setMode('option');
        setSelectedIndex(
          (prev) =>
            (prev - 1 + predefinedOptions.length) % predefinedOptions.length,
        );
        return;
      }

      if (key.downArrow) {
        setMode('option');
        setSelectedIndex((prev) => (prev + 1) % predefinedOptions.length);
        return;
      }
    }

    if (key.return) {
      if (mode === 'option' && predefinedOptions.length > 0) {
        onSubmit(questionId, predefinedOptions[selectedIndex]);
      } else {
        onSubmit(questionId, inputValue);
      }
      return;
    }

    // Any other key press switches to input mode
    if (
      !key.ctrl &&
      !key.meta &&
      !key.escape &&
      !key.tab &&
      !key.shift &&
      !key.leftArrow &&
      !key.rightArrow &&
      input
    ) {
      setMode('input');
      // Update inputValue only if switching to input mode via typing
      // TextInput's onChange will handle subsequent typing
      if (mode === 'option') {
        setInputValue(input); // Start input with the typed character
      }
    }
  });

  const handleInputChange = (value: string) => {
    // Text input change also counts as interaction
    handleInteraction();
    
    if (value !== inputValue) {
      setInputValue(value);
      // If user starts typing, switch to input mode
      if (value.length > 0 && mode === 'option') {
        setMode('input');
      } else if (value.length === 0 && predefinedOptions.length > 0) {
        // Optionally switch back to option mode if input is cleared
        // setMode('option');
      }
    }
  };

  const handleSubmit = (value: string) => {
    // The primary submit logic is now handled in useInput via Enter key
    // This might still be called by TextInput's internal onSubmit, ensure consistency
    if (mode === 'option' && predefinedOptions.length > 0) {
      onSubmit(questionId, predefinedOptions[selectedIndex]);
    } else {
      onSubmit(questionId, value); // Use the value from TextInput in case it triggered submit
    }
  };

  return (
    <>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan" wrap="wrap">
          {question}
        </Text>
      </Box>

      {predefinedOptions.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor={true}>
            Use ↑/↓ to select options, type for custom input, Enter to submit
          </Text>
          {predefinedOptions.map((opt, i) => (
            <Text
              key={i}
              color={
                i === selectedIndex && mode === 'option'
                  ? 'greenBright'
                  : undefined
              }
            >
              {i === selectedIndex && mode === 'option' ? '› ' : '  '}
              {opt}
            </Text>
          ))}
        </Box>
      )}

      <Box>
        <Text color={mode === 'input' ? 'greenBright' : undefined}>
          {mode === 'input' ? '✎ ' : '› '}
          <TextInput
            placeholder={
              predefinedOptions.length > 0
                ? 'Type or select an option...'
                : 'Type your answer...'
            }
            onChange={handleInputChange}
            onSubmit={handleSubmit}
          />
        </Text>
      </Box>
    </>
  );
};
