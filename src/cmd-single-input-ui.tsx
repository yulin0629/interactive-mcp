import React, { FC, useState, useEffect } from 'react';
import { render, Box, Text, useApp } from 'ink';
import { ProgressBar, TextInput } from '@inkjs/ui';
import { useInput } from 'ink';
import fs from 'fs/promises';
import path from 'path'; // Import path module

// Parse command line arguments from a single JSON-encoded argument for safety
const parseArgs = () => {
  const args = process.argv.slice(2);
  const defaults = { prompt: "Enter your response:", timeout: 30, showCountdown: false as boolean, sessionId: undefined as string | undefined, outputFile: undefined as string | undefined, predefinedOptions: undefined as string[] | undefined };
  if (args[0]) {
    try {
      // Decode base64-encoded JSON payload to avoid quoting issues
      const decoded = Buffer.from(args[0], 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      return { ...defaults, ...parsed };
    } catch (e) {
      console.error('Invalid input options payload, using defaults.', e);
    }
  }
  return defaults;
};

// Get command line arguments
const options = parseArgs();

// Function to write response to output file if provided
const writeResponseToFile = async (response: string) => {
  if (!options.outputFile) return;
  // write file in UTF-8 format, errors propagate to caller
  await fs.writeFile(options.outputFile, response, 'utf8');

};

// Register process termination handlers at the root level
// These will fire even if the React component doesn't get a chance to clean up
const handleExit = () => {
  if (options.outputFile) {
    writeResponseToFile('')
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Failed to write exit file:', error);
        process.exit(1);
      });
  } else {
    process.exit(0);
  }
};

// Listen for termination signals right at the application root
process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
process.on('beforeExit', handleExit);

interface InteractiveInputProps {
  predefinedOptions?: string[];
  onSubmit: (value: string) => void;
}

const InteractiveInput: FC<InteractiveInputProps> = ({ predefinedOptions, onSubmit }) => {
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
        setCursorPosition(prev => Math.max(0, prev - 1));
      } else {
        // If in option mode, just switch to custom mode but keep cursor at 0
        setMode('custom');
        setCursorPosition(0);
      }
    } else if (key.rightArrow) {
      if (mode === 'custom') {
        // Move cursor right if possible
        setCursorPosition(prev => Math.min(customValue.length, prev + 1));
      } else {
        // If in option mode, switch to custom mode with cursor at end of text
        setMode('custom');
        setCursorPosition(customValue.length);
      }
    } else if (key.return) {
      const value = mode === 'custom'
        ? customValue
        : (predefinedOptions && predefinedOptions[selectedIndex]) || '';
      onSubmit(value);
    } else if (key.backspace || key.delete) {
      if (mode === 'custom') {
        if (key.delete && cursorPosition < customValue.length) {
          // Delete: remove character at cursor position
          setCustomValue(prev =>
            prev.slice(0, cursorPosition) + prev.slice(cursorPosition + 1)
          );
        } else if (key.backspace && cursorPosition > 0) {
          // Backspace: remove character before cursor and move cursor left
          setCustomValue(prev =>
            prev.slice(0, cursorPosition - 1) + prev.slice(cursorPosition)
          );
          setCursorPosition(prev => prev - 1);
        }
      }
    } else if (input && input.length === 1 && !key.ctrl && !key.meta) {
      // Any other key appends to custom input
      setMode('custom');
      // Insert at cursor position instead of appending
      setCustomValue((prev) =>
        prev.slice(0, cursorPosition) + input + prev.slice(cursorPosition)
      );
      setCursorPosition(prev => prev + 1);
    }
  });

  return (
    <>
      {predefinedOptions && predefinedOptions.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text>Use ↑/↓ to select options, type any key for custom input, Enter to submit</Text>
          {predefinedOptions.map((opt, i) => (
            <Text key={i} color={i === selectedIndex ? (mode === "option" ? 'greenBright' : 'green') : undefined}>
              {i === selectedIndex ? (mode === "option" ? '› ' : '  ') : '  '}{opt}
            </Text>
          ))}
        </Box>
      )}
      {/* Custom input line with cursor */}
      <Box marginBottom={1}>
        <Box>
          <Text color={customValue.length > 0 || mode === 'custom' ? (mode === "custom" ? 'greenBright' : 'green') : undefined}>
            {(customValue.length > 0 && mode === "custom") ? '✎ ' : '  '}
            {/* Only show "Custom: " label when there are predefined options */}
            {predefinedOptions && predefinedOptions.length > 0 ? 'Custom: ' : ''}
            {customValue.slice(0, cursorPosition)}
          </Text>
          {/* Cursor with highlighted character underneath */}
          {(
            charUnderCursor ? (
              <Text backgroundColor="green" color="black">
                {charUnderCursor}
              </Text>
            ) : (
              <Text color={mode === 'custom' ? "green" : undefined}>█</Text>
            )
          )}
          <Text color={customValue.length > 0 || mode === 'custom' ? (mode === "custom" ? 'greenBright' : 'green') : undefined}>
            {customValue.slice(cursorPosition + 1)}
          </Text>
        </Box>
      </Box>
    </>
  );
};

interface AppProps {
  projectName?: string;
  prompt: string;
  timeout: number;
  showCountdown: boolean;
  outputFile?: string;
  predefinedOptions?: string[];
}

const App: FC<AppProps> = ({ projectName, prompt, timeout, showCountdown, outputFile, predefinedOptions }) => {
  console.clear(); // Clear console before rendering UI
  const { exit } = useApp();
  const [timeLeft, setTimeLeft] = useState(timeout);
  const heartbeatFilePath = (outputFile && options.sessionId)
    ? path.join(path.dirname(outputFile), `cmd-ui-heartbeat-${options.sessionId}.txt`)
    : undefined;

  // Handle countdown and auto-exit on timeout
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Write the timeout indicator string to output file on timeout, then exit
          writeResponseToFile('__TIMEOUT__')
            .catch(err => console.error('Failed to write to output file:', err))
            .finally(() => exit());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Add heartbeat interval
    let heartbeatInterval: NodeJS.Timeout | undefined;
    if (heartbeatFilePath) {
      heartbeatInterval = setInterval(async () => {
        try {
          await fs.writeFile(heartbeatFilePath, '', 'utf8'); // Update heartbeat file
        } catch (e) {
          // Ignore errors writing heartbeat file (e.g., if directory is removed)
        }
      }, 1000); // Update every second
    }

    return () => {
      clearInterval(timer);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval); // Clear heartbeat interval on cleanup
      }
    };
  }, [exit, heartbeatFilePath]); // Add heartbeatFilePath to dependency array

  // Handle final submission
  const handleSubmit = (value: string) => {
    writeResponseToFile(value)
      .catch(err => console.error('Failed to write to output file:', err))
      .finally(() => exit());
  };

  // Calculate progress value for the countdown bar (0 to 100)
  // Progress decreases as time passes (starts full, ends empty)
  const progressValue = (timeLeft / timeout) * 100;

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      {/* Display Project Name as Title */}
      {projectName && (
        <Box marginBottom={1} justifyContent="center">
          <Text bold color="magenta">{projectName}</Text>
        </Box>
      )}

      <Box marginBottom={1} flexDirection="column" width="100%">
        <Text bold color="cyan" wrap="wrap">{prompt}</Text>
      </Box>

      <InteractiveInput
        predefinedOptions={predefinedOptions}
        onSubmit={handleSubmit}
      />

      {showCountdown && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">Time remaining: {timeLeft}s</Text>
          <ProgressBar
            value={progressValue}
          />
        </Box>
      )}
    </Box>
  );
};

// Render the app
render(<App {...options} />);