import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import os from 'os';
import crypto from 'crypto';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Interface for active session info
interface SessionInfo {
  id: string;
  process: ChildProcess;
  outputDir: string;
  lastHeartbeatTime: number;
  isActive: boolean;
  title: string;
}

// Global object to keep track of active intensive chat sessions
const activeSessions: Record<string, SessionInfo> = {};

// Start heartbeat monitoring for sessions
startSessionMonitoring();

/**
 * Generate a unique temporary directory path for a session
 * @returns Path to a temporary directory
 */
async function createSessionDir(): Promise<string> {
  const tempDir = os.tmpdir();
  const sessionId = crypto.randomBytes(8).toString('hex');
  const sessionDir = path.join(tempDir, `intensive-chat-${sessionId}`);

  // Create the session directory
  await fs.mkdir(sessionDir, { recursive: true });

  return sessionDir;
}

/**
 * Start an intensive chat session
 * @param title Title for the chat session
 * @param initialQuestion Optional initial question to kick off the session
 * @param initialOptions Optional predefined options for the initial question
 * @returns Session ID for the created session
 */
export async function startIntensiveChatSession(
  title: string,
  initialQuestion?: string,
  initialOptions?: string[],
): Promise<string> {
  // Create a session directory
  const sessionDir = await createSessionDir();

  // Generate a unique session ID
  const sessionId = path.basename(sessionDir).replace('intensive-chat-', '');

  // Path to the UI script
  const uiScriptPath = path.join(__dirname, 'cmd-intensive-chat-ui.js');

  // Create options payload for the UI
  const options = {
    sessionId,
    title,
    outputDir: sessionDir,
    initialQuestion,
    initialPredefinedOptions: initialOptions,
  };

  // Encode options as base64 payload
  const payload = Buffer.from(JSON.stringify(options)).toString('base64');

  // Launch the UI process
  const process = spawn('node', [uiScriptPath, payload], {
    stdio: ['ignore', 'ignore', 'ignore'],
    shell: true,
    detached: true,
    windowsHide: false,
  });

  // Unref the process so it can run independently
  process.unref();

  // Store session info
  activeSessions[sessionId] = {
    id: sessionId,
    process,
    outputDir: sessionDir,
    lastHeartbeatTime: Date.now(),
    isActive: true,
    title,
  };

  // Wait a bit to ensure the UI has started
  await new Promise((resolve) => setTimeout(resolve, 500));

  return sessionId;
}

/**
 * Ask a new question in an existing intensive chat session
 * @param sessionId ID of the session to ask in
 * @param question The question text to ask
 * @param predefinedOptions Optional predefined options for the question
 * @returns The user's response or null if session is not active
 */
export async function askQuestionInSession(
  sessionId: string,
  question: string,
  predefinedOptions?: string[],
): Promise<string | null> {
  const session = activeSessions[sessionId];

  if (!session || !session.isActive) {
    return null; // Session doesn't exist or is not active
  }

  // Generate a unique ID for this question-answer pair
  const questionId = crypto.randomUUID();

  // Create the input data object
  const inputData: { id: string; text: string; options?: string[] } = {
    id: questionId,
    text: question,
  };

  if (predefinedOptions && predefinedOptions.length > 0) {
    inputData.options = predefinedOptions;
  }

  // Write the combined input data to a session-specific JSON file
  const inputFilePath = path.join(session.outputDir, `${sessionId}.json`);
  await fs.writeFile(inputFilePath, JSON.stringify(inputData), 'utf8');

  // Wait for the response file corresponding to the generated ID
  const responseFilePath = path.join(
    session.outputDir,
    `response-${questionId}.txt`,
  );

  // Wait for response with timeout
  const maxWaitTime = 60000; // 60 seconds max wait time
  const pollInterval = 100; // 100ms polling interval
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Check if the response file exists
      await fs.access(responseFilePath);

      // Read the response
      const response = await fs.readFile(responseFilePath, 'utf8');

      // Clean up the response file
      await fs.unlink(responseFilePath).catch(() => {});

      return response;
    } catch (e) {
      // Response file doesn't exist yet, check session status
      if (!(await isSessionActive(sessionId))) {
        return null; // Session has ended
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  // Timeout reached
  return null;
}

/**
 * Stop an active intensive chat session
 * @param sessionId ID of the session to stop
 * @returns True if session was stopped, false otherwise
 */
export async function stopIntensiveChatSession(
  sessionId: string,
): Promise<boolean> {
  const session = activeSessions[sessionId];

  if (!session || !session.isActive) {
    return false; // Session doesn't exist or is already inactive
  }

  // Write close signal file
  const closeFilePath = path.join(session.outputDir, 'close-session.txt');
  await fs.writeFile(closeFilePath, '', 'utf8');

  // Give the process some time to exit gracefully
  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    // Force kill the process if it's still running
    if (!session.process.killed) {
      process.kill(-session.process.pid!, 'SIGTERM');
    }
  } catch (e) {
    // Process might have already exited
  }

  // Mark session as inactive
  session.isActive = false;

  // Clean up session directory after a delay
  setTimeout(async () => {
    try {
      await fs.rm(session.outputDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore errors during cleanup
    }

    // Remove from active sessions
    delete activeSessions[sessionId];
  }, 2000);

  return true;
}

/**
 * Check if a session is still active
 * @param sessionId ID of the session to check
 * @returns True if session is active, false otherwise
 */
export async function isSessionActive(sessionId: string): Promise<boolean> {
  const session = activeSessions[sessionId];

  if (!session) {
    return false; // Session doesn't exist
  }

  if (!session.isActive) {
    return false; // Session was manually marked as inactive
  }

  try {
    // Check the heartbeat file
    const heartbeatPath = path.join(session.outputDir, 'heartbeat.txt');
    const stats = await fs.stat(heartbeatPath);

    // Check if heartbeat was updated recently (within last 2 seconds)
    const heartbeatAge = Date.now() - stats.mtime.getTime();
    if (heartbeatAge > 2000) {
      // Heartbeat is too old, session is likely dead
      session.isActive = false;
      return false;
    }

    return true;
  } catch (e) {
    // Error accessing heartbeat file, session is likely dead
    session.isActive = false;
    return false;
  }
}

/**
 * Start background monitoring of all active sessions
 */
function startSessionMonitoring() {
  setInterval(async () => {
    for (const sessionId of Object.keys(activeSessions)) {
      const isActive = await isSessionActive(sessionId);

      if (!isActive && activeSessions[sessionId]) {
        // Clean up inactive session
        try {
          // Kill process if it's somehow still running
          if (!activeSessions[sessionId].process.killed) {
            process.kill(-activeSessions[sessionId].process.pid!, 'SIGTERM');
          }
        } catch (e) {
          // Ignore errors during cleanup
        }

        // Clean up session directory
        try {
          await fs.rm(activeSessions[sessionId].outputDir, {
            recursive: true,
            force: true,
          });
        } catch (e) {
          // Ignore errors during cleanup
        }

        // Remove from active sessions
        delete activeSessions[sessionId];
      }
    }
  }, 5000); // Check every 5 seconds
}
