import React, { FC, useState, useEffect } from 'react';
import { render, Box, Text, useApp } from 'ink';
import { ProgressBar } from '@inkjs/ui';
import fs from 'fs/promises';
import path from 'path'; // Import path module
import logger from '../../utils/logger.js';
import { InteractiveInput } from '../../components/InteractiveInput.js'; // Import shared component

// Parse command line arguments from a single JSON-encoded argument for safety
const parseArgs = () => {
  const args = process.argv.slice(2);
  const defaults = {
    prompt: 'Enter your response:',
    timeout: 30,
    showCountdown: false as boolean,
    sessionId: undefined as string | undefined,
    outputFile: undefined as string | undefined,
    predefinedOptions: undefined as string[] | undefined,
  };
  if (args[0]) {
    try {
      // Decode base64-encoded JSON payload to avoid quoting issues
      const decoded = Buffer.from(args[0], 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      return { ...defaults, ...parsed };
    } catch (e) {
      logger.error(
        'Invalid input options payload, using defaults.',
        e instanceof Error ? e.message : e,
      );
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
      .catch((error) => {
        logger.error('Failed to write exit file:', error);
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

interface AppProps {
  projectName?: string;
  prompt: string;
  timeout: number;
  showCountdown: boolean;
  outputFile?: string;
  predefinedOptions?: string[];
}

const App: FC<AppProps> = ({
  projectName,
  prompt,
  timeout,
  showCountdown,
  outputFile,
  predefinedOptions,
}) => {
  // console.clear(); // Clear console before rendering UI - Removed from here
  const { exit } = useApp();
  const [timeLeft, setTimeLeft] = useState(timeout);
  const heartbeatFilePath =
    outputFile && options.sessionId
      ? path.join(
          path.dirname(outputFile),
          `cmd-ui-heartbeat-${options.sessionId}.txt`,
        )
      : undefined;

  // Clear console only once on mount
  useEffect(() => {
    console.clear();
  }, []); // Empty dependency array ensures this runs only once

  // Handle countdown and auto-exit on timeout
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Write the timeout indicator string to output file on timeout, then exit
          writeResponseToFile('__TIMEOUT__')
            .catch((err) =>
              logger.error('Failed to write to output file:', err),
            )
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
        } catch (_e) {
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
    logger.debug(`User submitted: ${value}`);
    writeResponseToFile(value)
      .then(() => {
        exit();
      })
      .catch((err) => logger.error('Failed to write to output file:', err));
  };

  // Wrapper for handleSubmit to match the signature of InteractiveInput's onSubmit
  const handleInputSubmit = (_questionId: string, value: string) => {
    handleSubmit(value);
  };

  // Calculate progress value for the countdown bar (0 to 100)
  // Progress decreases as time passes (starts full, ends empty)
  const progressValue = (timeLeft / timeout) * 100;

  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="round"
      borderColor="blue"
    >
      {/* Display Project Name as Title */}
      {projectName && (
        <Box marginBottom={1} justifyContent="center">
          <Text bold color="magenta">
            {projectName}
          </Text>
        </Box>
      )}

      <InteractiveInput
        question={prompt} // Use prompt as the question
        questionId={prompt} // Use prompt as a dummy ID
        predefinedOptions={predefinedOptions}
        onSubmit={handleInputSubmit} // Use the wrapper function
      />

      {showCountdown && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">Time remaining: {timeLeft}s</Text>
          <ProgressBar value={progressValue} />
        </Box>
      )}
    </Box>
  );
};

// Render the app
render(<App {...options} />);
