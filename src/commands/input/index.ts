import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fsPromises from 'fs/promises';
import { watch, FSWatcher } from 'fs';
import os from 'os';
import crypto from 'crypto';
// Updated import to use @ alias
import { USER_INPUT_TIMEOUT_SECONDS } from '@/constants.js'; // Import the constant
import logger from '../../utils/logger.js';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define cleanupResources outside the promise to be accessible in the final catch
async function cleanupResources(
  heartbeatPath: string,
  responsePath: string,
  optionsPath: string, // Added optionsPath
) {
  await Promise.allSettled([
    fsPromises.unlink(responsePath).catch(() => {}),
    fsPromises.unlink(heartbeatPath).catch(() => {}),
    fsPromises.unlink(optionsPath).catch(() => {}), // Cleanup options file
    // Potentially add cleanup for other session-related files if needed
  ]);
}

/**
 * Display a command window with a prompt and return user input
 * @param projectName Name of the project requesting input (used for title)
 * @param promptMessage Message to display to the user
 * @param timeoutSeconds Timeout in seconds
 * @param showCountdown Whether to show a countdown timer
 * @param predefinedOptions Optional list of predefined options for quick selection
 * @returns User input or empty string if timeout
 */
export async function getCmdWindowInput(
  projectName: string,
  promptMessage: string,
  timeoutSeconds: number = USER_INPUT_TIMEOUT_SECONDS, // Use constant as default
  showCountdown: boolean = true,
  predefinedOptions?: string[],
): Promise<string> {
  // Create a temporary file for the detached process to write to
  const sessionId = crypto.randomBytes(8).toString('hex');
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `cmd-ui-response-${sessionId}.txt`);
  const heartbeatFilePath = path.join(
    tempDir,
    `cmd-ui-heartbeat-${sessionId}.txt`,
  );
  const optionsFilePath = path.join(
    tempDir,
    `cmd-ui-options-${sessionId}.json`,
  ); // New options file path

  return new Promise<string>((resolve) => {
    // Wrap the async setup logic in an IIFE
    void (async () => {
      // Path to the UI script (will be in the same directory after compilation)
      const uiScriptPath = path.join(__dirname, 'ui.js');

      // Gather options
      const options = {
        projectName,
        prompt: promptMessage,
        timeout: timeoutSeconds,
        showCountdown,
        sessionId,
        outputFile: tempFilePath,
        heartbeatFile: heartbeatFilePath, // Pass heartbeat file path too
        predefinedOptions,
      };

      let ui;

      // Moved setup into try block
      try {
        // Write options to the file before spawning
        await fsPromises.writeFile(
          optionsFilePath,
          JSON.stringify(options),
          'utf8',
        );

        // Platform-specific spawning
        const platform = os.platform();

        if (platform === 'darwin') {
          // macOS - Use safer terminal launch approach to avoid input method conflicts
          const escapedScriptPath = uiScriptPath;
          const escapedSessionId = sessionId; // Only need sessionId now
          const nodeBin = process.execPath;

          // Primary: Try iTerm2 first (better input method support)
          const launchViaITerm = async (): Promise<ChildProcess | null> => {
            try {
              // Check if iTerm2 is available
              const itermCheck = spawn('osascript', [
                '-e',
                'tell application "System Events" to exists application process "iTerm2"',
              ]);

              const itermAvailable = await new Promise<boolean>((resolve) => {
                let output = '';
                itermCheck.stdout?.on('data', (data) => {
                  output += data.toString();
                });
                itermCheck.on('close', (code) => {
                  resolve(code === 0 && output.trim() === 'true');
                });
                itermCheck.on('error', () => resolve(false));
              });

              if (itermAvailable) {
                const nodeCommand = `exec "${nodeBin}" "${escapedScriptPath}" "${escapedSessionId}" "${tempDir}"; exit 0`;
                const itermCommand = `osascript -e 'tell application "iTerm2" to create window with default profile command "${nodeCommand}"'`;

                return spawn(itermCommand, [], {
                  stdio: ['ignore', 'ignore', 'ignore'],
                  shell: true,
                  detached: true,
                });
              }
              return null;
            } catch (e) {
              logger.debug({ error: e }, 'iTerm2 launch attempt failed');
              return null;
            }
          };

          // Improved fallback using .command file (avoids AppleScript automation issues)
          const launchViaCommandFile =
            async (): Promise<ChildProcess | null> => {
              try {
                const launcherPath = path.join(
                  tempDir,
                  `interactive-mcp-launch-${sessionId}.command`,
                );

                // Create a more robust launcher script with proper environment setup
                const scriptContent = [
                  '#!/bin/bash',
                  '# Set proper locale and input method environment',
                  'export LANG=${LANG:-en_US.UTF-8}',
                  'export LC_ALL=${LC_ALL:-en_US.UTF-8}',
                  '# Avoid input method conflicts by setting terminal as input-method-aware',
                  'export __MCP_TERMINAL_LAUNCH=1',
                  `exec "${nodeBin}" "${escapedScriptPath}" "${escapedSessionId}" "${tempDir}"`,
                  '',
                ].join('\n');

                await fsPromises.writeFile(launcherPath, scriptContent, 'utf8');
                await fsPromises.chmod(launcherPath, 0o755);

                // Use 'open' without AppleScript to avoid automation conflicts
                const openProc = spawn(
                  'open',
                  ['-a', 'Terminal', launcherPath],
                  {
                    stdio: ['ignore', 'ignore', 'ignore'],
                    detached: true,
                    env: {
                      ...process.env,
                      // Prevent AppleScript events from interfering
                      __MCP_NO_APPLESCRIPT: '1',
                    },
                  },
                );

                // Clean up the .command file after a delay
                setTimeout(async () => {
                  try {
                    await fsPromises.unlink(launcherPath);
                  } catch (e) {
                    // Ignore cleanup errors
                  }
                }, 5000);

                return openProc;
              } catch (e) {
                logger.error({ error: e }, 'Command file launcher failed');
                // Final fallback: try direct terminal command
                try {
                  const nodeCommand = `"${nodeBin}" "${escapedScriptPath}" "${escapedSessionId}" "${tempDir}"`;
                  return spawn(
                    'osascript',
                    [
                      '-e',
                      `tell application "Terminal" to do script "${nodeCommand}"`,
                    ],
                    {
                      stdio: ['ignore', 'ignore', 'ignore'],
                      detached: true,
                    },
                  );
                } catch (finalError) {
                  logger.error(
                    { error: finalError },
                    'All terminal launch methods failed',
                  );
                  return null;
                }
              }
            };

          // Try iTerm2 first, fallback to .command file approach
          ui = await launchViaITerm();
          if (!ui) {
            ui = await launchViaCommandFile();
          }
        } else if (platform === 'win32') {
          // Windows
          // Pass only the sessionId
          ui = spawn(process.execPath, [uiScriptPath, sessionId], {
            stdio: ['ignore', 'ignore', 'ignore'],
            shell: true,
            detached: true,
            windowsHide: false,
          });
        } else {
          // Linux or other
          // Pass only the sessionId
          ui = spawn(process.execPath, [uiScriptPath, sessionId], {
            stdio: ['ignore', 'ignore', 'ignore'],
            shell: true,
            detached: true,
          });
        }

        let watcher: FSWatcher | null = null;
        let timeoutHandle: NodeJS.Timeout | null = null;
        let heartbeatInterval: NodeJS.Timeout | null = null;
        let heartbeatFileSeen = false; // Track if we've ever seen the heartbeat file
        const startTime = Date.now(); // Record start time for initial grace period

        // Define cleanupAndResolve inside the promise scope
        const cleanupAndResolve = async (response: string) => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          if (watcher) {
            watcher.close();
            watcher = null;
          }
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
          }

          // Pass optionsFilePath to cleanupResources
          await cleanupResources(
            heartbeatFilePath,
            tempFilePath,
            optionsFilePath,
          );

          resolve(response);
        };

        // Listen for process exit events - moved definition before IIFE start
        const handleExit = (code?: number | null) => {
          // If the process exited with a non-zero code and watcher/timeout still exist
          if (code !== 0 && (watcher || timeoutHandle)) {
            void cleanupAndResolve('');
          }
        };

        const handleError = () => {
          if (watcher || timeoutHandle) {
            // Only cleanup if not already cleaned up
            void cleanupAndResolve('');
          }
        };

        ui?.on('exit', handleExit);
        ui?.on('error', handleError);

        // Unref the child process so the parent can exit independently
        ui?.unref();

        // Create an empty temp file before watching for user response
        await fsPromises.writeFile(tempFilePath, '', 'utf8'); // Use renamed import

        // Wait briefly for the heartbeat file to potentially be created
        await new Promise((res) => setTimeout(res, 500));

        // Watch for content being written to the temp file
        watcher = watch(tempFilePath, (eventType: string) => {
          // Removed async
          if (eventType === 'change') {
            // Read the response and cleanup
            // Use an async IIFE inside the non-async callback
            void (async () => {
              try {
                const data = await fsPromises.readFile(tempFilePath, 'utf8'); // Use renamed import
                if (data) {
                  const response = data.trim();
                  void cleanupAndResolve(response); // Mark promise as intentionally ignored
                }
              } catch (readError) {
                logger.error({ err: readError }, 'Error reading response file');
                void cleanupAndResolve('');
              }
            })();
          }
        });

        // Start heartbeat check interval
        heartbeatInterval = setInterval(() => {
          // Removed async
          // Use an async IIFE inside the non-async callback
          void (async () => {
            try {
              const stats = await fsPromises.stat(heartbeatFilePath); // Use renamed import
              const now = Date.now();
              // If file hasn't been modified in the last 3 seconds, assume dead
              if (now - stats.mtime.getTime() > 3000) {
                logger.info(
                  `Heartbeat file ${heartbeatFilePath} hasn't been updated recently. Process likely exited.`, // Added logger info
                );
                void cleanupAndResolve(''); // Mark promise as intentionally ignored
              } else {
                heartbeatFileSeen = true; // Mark that we've seen the file
              }
            } catch (err: unknown) {
              // Type err as unknown
              // Check if err is an error object with a code property
              if (err && typeof err === 'object' && 'code' in err) {
                const error = err as { code: string }; // Type assertion
                if (error.code === 'ENOENT') {
                  // File not found
                  if (heartbeatFileSeen) {
                    // File existed before but is now gone, assume dead
                    logger.info(
                      `Heartbeat file ${heartbeatFilePath} not found after being seen. Process likely exited.`, // Added logger info
                    );
                    void cleanupAndResolve(''); // Mark promise as intentionally ignored
                  } else if (Date.now() - startTime > 60000) {
                    // File never appeared and extended grace period (60s) passed, assume dead
                    logger.info(
                      `Heartbeat file ${heartbeatFilePath} never appeared within 60s. Process likely failed to start or was blocked by permissions.`,
                    );
                    void cleanupAndResolve('');
                  }
                  // Otherwise, file just hasn't appeared yet, wait longer
                } else {
                  // Removed check for !== 'ENOENT' as it's implied
                  // Log other errors and resolve
                  logger.error({ error }, 'Heartbeat check error');
                  void cleanupAndResolve('');
                }
              } else {
                // Handle cases where err is not an object with a code property
                logger.error(
                  { error: err },
                  'Unexpected heartbeat check error',
                );
                void cleanupAndResolve(''); // Mark promise as intentionally ignored
              }
            }
          })();
        }, 1500); // Check every 1.5 seconds

        // Timeout to stop watching if no response within limit
        timeoutHandle = setTimeout(
          () => {
            logger.info(
              `Input timeout reached after ${timeoutSeconds} seconds.`,
            ); // Added logger info
            void cleanupAndResolve(''); // Mark promise as intentionally ignored
          },
          timeoutSeconds * 1000 + 5000,
        ); // Add a bit more buffer
      } catch (setupError) {
        logger.error({ error: setupError }, 'Error during cmd-input setup');
        // Ensure cleanup happens even if setup fails
        // Pass optionsFilePath to cleanupResources
        await cleanupResources(
          heartbeatFilePath,
          tempFilePath,
          optionsFilePath,
        );
        resolve(''); // Resolve with empty string after attempting cleanup
      }
    })(); // Execute the IIFE
  });
}
