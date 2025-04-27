import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fsPromises from 'fs/promises';
import { watch, FSWatcher } from 'fs';
import os from 'os';
import crypto from 'crypto';
// Updated import to use @ alias
import { USER_INPUT_TIMEOUT_SECONDS } from '@/constants.js'; // Import the constant

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  return new Promise<string>((resolve) => {
    // Wrap the async setup logic in an IIFE
    void (async () => {
      // Path to the UI script (will be in the same directory after compilation)
      const uiScriptPath = path.join(__dirname, 'ui.js');

      // Spawn a new process to run the UI in a detached window, passing all options as a single JSON argument to prevent injection
      const options = {
        projectName,
        prompt: promptMessage,
        timeout: timeoutSeconds,
        showCountdown,
        sessionId,
        outputFile: tempFilePath,
        predefinedOptions,
      };

      // Encode options as base64 payload to avoid quoting issues on Windows
      const payload = Buffer.from(JSON.stringify(options)).toString('base64');
      let ui;

      // Moved setup into try block
      try {
        // Platform-specific spawning
        const platform = os.platform();

        if (platform === 'darwin') {
          // macOS
          // Escape potential special characters in paths/payload for the shell command
          // For the shell command executed by 'do script', we primarily need to handle spaces
          // or other characters that might break the command if paths aren't quoted.
          // The `${...}` interpolation within backticks handles basic variable insertion.
          // Quoting the paths within nodeCommand handles spaces.
          const escapedScriptPath = uiScriptPath; // Keep original path, rely on quotes below
          const escapedPayload = payload; // Keep original payload, rely on quotes below

          // Construct the command string directly for the shell. Quotes handle paths with spaces.
          const nodeCommand = `exec node "${escapedScriptPath}" "${escapedPayload}"; exit 0`;

          // Escape the node command for osascript's AppleScript string:
          // 1. Escape existing backslashes (\ -> \\)
          // 2. Escape double quotes (" -> \")
          const escapedNodeCommand = nodeCommand
            // Escape backslashes first
            .replace(/\\/g, '\\\\')
            // Then escape double quotes
            .replace(/"/g, '\\"');

          // Activate Terminal first, then do script with exec
          const command = `osascript -e 'tell application "Terminal" to activate' -e 'tell application "Terminal" to do script "${escapedNodeCommand}"'`;
          const commandArgs: string[] = []; // No args needed when command is a single string for shell

          ui = spawn(command, commandArgs, {
            stdio: ['ignore', 'ignore', 'ignore'],
            shell: true,
            detached: true,
          });
        } else if (platform === 'win32') {
          // Windows

          ui = spawn('node', [uiScriptPath, payload], {
            stdio: ['ignore', 'ignore', 'ignore'],
            shell: true,
            detached: true,
            windowsHide: false,
          });
        } else {
          // Linux or other - use original method (might not pop up window)

          ui = spawn('node', [uiScriptPath, payload], {
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

        const cleanupAndResolve = async (response: string) => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          if (watcher) {
            watcher.close(); // Ensure watcher is closed
            watcher = null; // Nullify watcher after closing
          }
          if (timeoutHandle) {
            clearTimeout(timeoutHandle); // Ensure timeout is cleared
            timeoutHandle = null; // Nullify timeout handle
          }

          // Use Promise.allSettled to attempt cleanup without failing if one file is missing
          await Promise.allSettled([
            fsPromises.unlink(tempFilePath).catch(() => {}), // Use renamed import
            fsPromises.unlink(heartbeatFilePath).catch(() => {}), // Use renamed import
          ]);

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

        ui.on('exit', handleExit);
        ui.on('error', handleError);

        // Unref the child process so the parent can exit independently
        ui.unref();

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
                console.error('Error reading response file:', readError);
                void cleanupAndResolve(''); // Cleanup on read error
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
                    void cleanupAndResolve(''); // Mark promise as intentionally ignored
                  } else if (Date.now() - startTime > 7000) {
                    // File never appeared and initial grace period (7s) passed, assume dead
                    void cleanupAndResolve(''); // Mark promise as intentionally ignored
                  }
                  // Otherwise, file just hasn't appeared yet, wait longer
                } else if (error.code !== 'ENOENT') {
                  // Log other errors, but potentially continue?
                  console.error('Heartbeat check error:', error);
                  void cleanupAndResolve(''); // Resolve immediately on other errors? Marked promise as intentionally ignored
                }
              } else {
                // Handle cases where err is not an object with a code property
                console.error('Unexpected heartbeat check error:', err);
                void cleanupAndResolve(''); // Mark promise as intentionally ignored
              }
            }
          })();
        }, 1500); // Check every 1.5 seconds

        // Timeout to stop watching if no response within limit
        timeoutHandle = setTimeout(
          () => {
            void cleanupAndResolve(''); // Mark promise as intentionally ignored
          },
          timeoutSeconds * 1000 + 5000,
        ); // Add a bit more buffer
      } catch (setupError) {
        console.error('Error during cmd-input setup:', setupError);
        resolve(''); // Resolve with empty string on setup error
      }
    })(); // Execute the IIFE
  });
}
