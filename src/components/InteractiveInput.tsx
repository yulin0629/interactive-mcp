import React, { FC, useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface InteractiveInputProps {
  question: string;
  questionId: string;
  predefinedOptions?: string[];
  onSubmit: (questionId: string, value: string) => void;
}

export const InteractiveInput: FC<InteractiveInputProps> = ({
  question,
  questionId,
  predefinedOptions,
  onSubmit,
}) => {
  const [mode, setMode] = useState<'option' | 'custom'>('option');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customValue, setCustomValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  // Get the character under cursor, if any
  const charUnderCursor = customValue[cursorPosition] || null;

  // If there are no predefined options, default to custom input mode
  useEffect(() => {
    if (!predefinedOptions || predefinedOptions.length === 0) {
      setMode('custom');
    }
  }, [predefinedOptions]);

  // Capture key presses
  useInput((input, key) => {
    if ((key.upArrow || key.downArrow) && predefinedOptions?.length) {
      // cycle selection among predefined options
      setSelectedIndex((prev) => {
        if (key.upArrow) {
          return prev > 0 ? prev - 1 : predefinedOptions.length - 1;
        } else {
          return prev < predefinedOptions.length - 1 ? prev + 1 : 0;
        }
      });
      setMode('option');
    } else if (key.leftArrow) {
      if (mode === 'custom') {
        // Move cursor left if possible
        setCursorPosition((prev) => Math.max(0, prev - 1));
      } else {
        // If in option mode, just switch to custom mode but keep cursor at 0
        setMode('custom');
        setCursorPosition(0);
      }
    } else if (key.rightArrow) {
      if (mode === 'custom') {
        // Move cursor right if possible
        setCursorPosition((prev) => Math.min(customValue.length, prev + 1));
      } else {
        // If in option mode, switch to custom mode with cursor at end of text
        setMode('custom');
        setCursorPosition(customValue.length);
      }
    } else if (key.return) {
      let valueToSubmit: string;

      // Prioritize selected option if options exist and custom input is empty
      if (
        predefinedOptions &&
        predefinedOptions.length > 0 &&
        customValue === ''
      ) {
        valueToSubmit = predefinedOptions[selectedIndex] || '';
      } else {
        // Otherwise, prioritize custom input, falling back to selected option if custom is empty
        valueToSubmit =
          customValue ||
          (predefinedOptions && predefinedOptions[selectedIndex]) ||
          '';
      }

      onSubmit(questionId, valueToSubmit);
    } else if (key.backspace || key.delete) {
      if (mode === 'custom') {
        if (key.delete && cursorPosition < customValue.length) {
          // Delete: remove character at cursor position
          setCustomValue(
            (prev) =>
              prev.slice(0, cursorPosition) + prev.slice(cursorPosition + 1),
          );
        } else if (key.backspace && cursorPosition > 0) {
          // Backspace: remove character before cursor and move cursor left
          setCustomValue(
            (prev) =>
              prev.slice(0, cursorPosition - 1) + prev.slice(cursorPosition),
          );
          setCursorPosition((prev) => prev - 1);
        }
      }
    } else if (input && input.length === 1 && !key.ctrl && !key.meta) {
      // Any other key appends to custom input
      setMode('custom');
      // Insert at cursor position instead of appending
      setCustomValue(
        (prev) =>
          prev.slice(0, cursorPosition) + input + prev.slice(cursorPosition),
      );
      setCursorPosition((prev) => prev + 1);
    }
  });

  return (
    <>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan" wrap="wrap">
          {question}
        </Text>
      </Box>

      {predefinedOptions && predefinedOptions.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor={true}>
            Use ↑/↓ to select options, Enter to submit
          </Text>
          {predefinedOptions.map((opt, i) => (
            <Text
              key={i}
              color={
                i === selectedIndex
                  ? mode === 'option'
                    ? 'greenBright'
                    : 'green'
                  : undefined
              }
            >
              {i === selectedIndex ? (mode === 'option' ? '› ' : '  ') : '  '}
              {opt}
            </Text>
          ))}
        </Box>
      )}

      {/* Custom input line with cursor */}
      <Box marginBottom={1}>
        <Box>
          <Text
            color={
              customValue.length > 0 || mode === 'custom'
                ? mode === 'custom'
                  ? 'greenBright'
                  : 'green'
                : undefined
            }
          >
            {customValue.length > 0 && mode === 'custom' ? '✎ ' : '  '}
            {/* Only show "Custom: " label when there are predefined options */}
            {predefinedOptions && predefinedOptions.length > 0
              ? 'Custom: '
              : ''}
            {customValue.slice(0, cursorPosition)}
          </Text>
          {/* Cursor with highlighted character underneath */}
          {charUnderCursor ? (
            <Text backgroundColor="green" color="black">
              {charUnderCursor}
            </Text>
          ) : (
            <Text color={mode === 'custom' ? 'green' : undefined}>█</Text>
          )}
          <Text
            color={
              customValue.length > 0 || mode === 'custom'
                ? mode === 'custom'
                  ? 'greenBright'
                  : 'green'
                : undefined
            }
          >
            {customValue.slice(cursorPosition + 1)}
          </Text>
        </Box>
      </Box>
    </>
  );
};
