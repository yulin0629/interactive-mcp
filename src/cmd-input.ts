import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { watch } from 'fs';
import os from 'os';
import crypto from 'crypto';
import { USER_INPUT_TIMEOUT_SECONDS } from './constants.js'; // Import the constant

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Generate a unique temporary file path
 * @returns Path to a temporary file
 */
async function getTempFilePath(): Promise<string> {
  const tempDir = os.tmpdir();
  const randomId = crypto.randomBytes(8).toString('hex');
  const tempFile = path.join(tempDir, `cmd-ui-response-${randomId}.txt`);
  return tempFile;
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
  const tempFilePath = await getTempFilePath();
  let processExited = false;

  return new Promise<string>(async (resolve) => {
    // Path to the UI script (will be in the same directory after compilation)
    const uiScriptPath = path.join(__dirname, 'cmd-single-input-ui.js');

    // Spawn a new process to run the UI in a detached window, passing all options as a single JSON argument to prevent injection
    const options = {
      projectName,
      prompt: promptMessage,
      timeout: timeoutSeconds,
      showCountdown,
      outputFile: tempFilePath,
      predefinedOptions,
    };

    // Encode options as base64 payload to avoid quoting issues on Windows
    const payload = Buffer.from(JSON.stringify(options)).toString('base64');
    let ui;

    // Platform-specific spawning
    const platform = os.platform();
    if (platform === 'darwin') { // macOS
      // Escape potential special characters in paths/payload for the shell command
      // For the shell command executed by 'do script', we primarily need to handle spaces
      // or other characters that might break the command if paths aren't quoted.
      // The `${...}` interpolation within backticks handles basic variable insertion.
      // Quoting the paths within nodeCommand handles spaces.
      const escapedScriptPath = uiScriptPath; // Keep original path, rely on quotes below
      const escapedPayload = payload;      // Keep original payload, rely on quotes below

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
    } else if (platform === 'win32') { // Windows
      ui = spawn('node', [uiScriptPath, payload], {
        stdio: ['ignore', 'ignore', 'ignore'],
        shell: true,
        detached: true,
        windowsHide: false,
      });
    } else { // Linux or other - use original method (might not pop up window)
      ui = spawn('node', [uiScriptPath, payload], {
        stdio: ['ignore', 'ignore', 'ignore'],
        shell: true,
        detached: true,
      });
    }

    // Listen for process exit events
    ui.on('exit', (code) => {
      processExited = true;

      // If the process exited with a non-zero code
      if (code !== 0) {
        cleanupAndResolve('');
      }
    });

    ui.on('error', () => {
      processExited = true;
      cleanupAndResolve('');
    });

    // Unref the child process so the parent can exit independently
    ui.unref();

    // Create an empty temp file before watching for user response
    await fs.writeFile(tempFilePath, '', 'utf8');

    // Watch for content being written to the temp file
    const watcher = watch(tempFilePath, async (eventType: string) => {
      if (eventType === 'change') {
        // Read the response and cleanup
        const data = await fs.readFile(tempFilePath, 'utf8');
        if (data) {
          const response = data.trim();
          watcher.close();
          clearTimeout(timeoutHandle);
          cleanupAndResolve(response);
        }
      }
    });

    // Timeout to stop watching if no response within limit
    const timeoutHandle = setTimeout(
      () => {
        watcher.close();
        cleanupAndResolve('');
      },
      timeoutSeconds * 1000 + 5000,
    );

    // Helper function for cleanup and resolution
    const cleanupAndResolve = async (response: string) => {
      // Clean up the temporary file if it exists
      try {
        await fs.unlink(tempFilePath);
      } catch (err: any) {
        // Ignore if file is already removed, otherwise log unexpected errors
        if (err.code !== 'ENOENT') {
          // console.error('Error deleting temp file:', err);
        }
      }

      resolve(response);
    };
  });
}
