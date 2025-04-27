#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import notifier from 'node-notifier';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getCmdWindowInput } from './cmd-input.js';
import {
  startIntensiveChatSession,
  askQuestionInSession,
  stopIntensiveChatSession,
} from './cmd-intensive-chat.js';
import { USER_INPUT_TIMEOUT_SECONDS } from './constants.js';

// Parse command-line arguments for global timeout
const argv = yargs(hideBin(process.argv))
  .option('timeout', {
    alias: 't',
    type: 'number',
    description: 'Default timeout for user input prompts in seconds',
    default: USER_INPUT_TIMEOUT_SECONDS,
  })
  .help()
  .alias('help', 'h')
  .parseSync();

const globalTimeoutSeconds = argv.timeout;

// Store active intensive chat sessions
const activeChatSessions = new Map<string, string>();
// Initialize MCP server
const server = new McpServer({
  name: 'Interactive MCP',
  version: '1.0.0',
  capabilities: {
    tools: {
      request_user_input: {
        description:
          'Send a question to the user and await their reply via OS notification or prompt.',
        parameters: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description:
                'Identifies the context/project making the request (appears in notification title)',
            },
            message: {
              type: 'string',
              description:
                'The specific question for the user (appears in notification body)',
            },
            predefinedOptions: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Predefined options / predicted answers for the user to choose from (optional, if not provided, user can type any response)',
            },
          },
          required: ['projectName', 'message'],
        },
      },
      message_complete_notification: {
        description:
          'Notify when a response has completed via OS notification.',
        parameters: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description:
                'Identifies the context/project making the notification (appears in notification title)',
            },
            message: {
              type: 'string',
              description:
                'The specific notification text (appears in the body)',
            },
          },
          required: ['projectName', 'message'],
        },
      },
      start_intensive_chat: {
        description:
          'Start an intensive chat session for gathering multiple answers quickly.',
        parameters: {
          type: 'object',
          properties: {
            sessionTitle: {
              type: 'string',
              description: 'Title for the intensive chat session',
            },
          },
          required: ['sessionTitle'],
        },
      },
      ask_intensive_chat: {
        description: 'Ask a question in an active intensive chat session.',
        parameters: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'ID of the intensive chat session',
            },
            question: {
              type: 'string',
              description: 'Question to ask the user',
            },
            predefinedOptions: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Predefined options for the user to choose from (optional)',
            },
          },
          required: ['sessionId', 'question'],
        },
      },
      stop_intensive_chat: {
        description: 'Stop and close an active intensive chat session.',
        parameters: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'ID of the intensive chat session to stop',
            },
          },
          required: ['sessionId'],
        },
      },
    },
  },
});

// Chat tool: echoes back user messages (placeholder for AI integration)
server.tool(
  'request_user_input',
  `<description>
Send a question to the user. **Crucial for clarifying requirements, confirming plans, or resolving ambiguity.**
You should call this tool whenever it has **any** uncertainty or needs clarification or confirmation, even for trivial or silly questions.
Feel free to ask anything! **Proactive questioning is preferred over making assumptions.**
</description>

<importantNotes>
- (!important!) **Use this tool FREQUENTLY** for any question that requires user input or confirmation.
- (!important!) Continue to generate existing messages after user answers.
- (!important!) Provide predefined options for quick selection if applicable.
- (!important!) **Essential for validating assumptions before proceeding with significant actions (e.g., code edits, running commands).**
</importantNotes>

<whenToUseThisTool>
- When you need clarification on user requirements or preferences
- When multiple implementation approaches are possible and user input is needed
- **Before making potentially impactful changes (code edits, file operations, complex commands)**
- When you need to confirm assumptions before proceeding
- When you need additional information not available in the current context
- When validating potential solutions before implementation
- When facing ambiguous instructions that require clarification
- When seeking feedback on generated code or solutions
- When needing permission to modify critical files or functionality
- **Whenever you feel even slightly unsure about the user's intent or the correct next step.**
</whenToUseThisTool>

<features>
- Cross-platform notification system (Windows, macOS, Linux)
- Configurable timeout mechanism to prevent indefinite waiting (set via -t/--timeout, defaults to ${globalTimeoutSeconds} seconds)
- Windows-specific command prompt display for better visibility
- Returns user response or timeout notification
- Maintains context across user interactions
- Handles empty responses gracefully
- Properly formats notifications with project context
</features>

<bestPractices>
- Keep questions concise and specific
- Provide clear options when applicable
- Limit questions to only what's necessary **to resolve the uncertainty**
- Format complex questions into simple choices
- Reference specific code or files when relevant
- Indicate why the information is needed
- Use appropriate urgency based on importance
</bestPractices>

<parameters>
- projectName: Identifies the context/project making the request (appears in notification title)
- message: The specific question for the user (appears in notification body)
- predefinedOptions: Predefined options / predicted answers for the user to choose from (optional, if not provided, user can type any response)
</parameters>

<examples>
- "Should I implement the authentication using JWT or OAuth?"
- "Do you want to use TypeScript interfaces or type aliases for this component?"
- "I found three potential bugs. Should I fix them all or focus on the critical one first?"
- "Can I refactor the database connection code to use connection pooling?"
- "Is it acceptable to add React Router as a dependency?"
- "I plan to modify function X in file Y. Is that correct?"
</examples>`,
  {
    projectName: z
      .string()
      .describe(
        'Identifies the context/project making the request (appears in notification title)',
      ),
    message: z
      .string()
      .describe(
        'The specific question for the user (appears in notification body)',
      ),
    predefinedOptions: z
      .array(z.string())
      .optional()
      .describe(
        'Predefined options / predicted answers for the user to choose from (optional, if not provided, user can type any response)',
      ),
  },
  async ({ projectName, message, predefinedOptions }) => {
    const promptMessage = `${projectName}: ${message}`;
    const answer = await getCmdWindowInput(
      projectName,
      promptMessage,
      globalTimeoutSeconds,
      true,
      predefinedOptions,
    );

    // Check for the specific timeout indicator
    if (answer === '__TIMEOUT__') {
      return {
        content: [
          { type: 'text', text: 'User did not reply: Timeout occurred.' },
        ],
      };
    }
    // Empty string means user submitted empty input, non-empty is actual reply
    else if (answer === '') {
      return {
        content: [{ type: 'text', text: 'User replied with empty input.' }],
      };
    } else {
      const reply = `User replied: ${answer}`;
      return { content: [{ type: 'text', text: reply }] };
    }
  },
);

// Notification tool: informs client that chat session is complete
server.tool(
  'message_complete_notification',
  `<description>
  Notify when a response has completed. Use this tool **once** at the end of **each and every** message to signal completion to the user.
</description>

<importantNotes>
- (!important!) **MANDATORY:** ONLY use this tool exactly once per message to signal completion. **Do not forget this step.**
</importantNotes>

<whenToUseThisTool>
- When you've completed answering a user's query
- When you've finished executing a task or a sequence of tool calls
- When a multi-step process is complete
- When you want to provide a summary of completed actions just before ending the response
</whenToUseThisTool>

<features>
- Cross-platform OS notifications (Windows, macOS, Linux)
- Reusable tool to signal end of message
- Should be called exactly once per LLM response
</features>

<bestPractices>
- Keep messages concise
- Use projectName consistently to group notifications by context
</bestPractices>

<parameters>
- projectName: Identifies the context/project making the notification (appears in notification title)
- message: The specific notification text (appears in the body)
</parameters>

<examples>
- { "projectName": "MyApp", "message": "Feature implementation complete. All tests passing." }
- { "projectName": "MyLib", "message": "Analysis complete: 3 issues found and fixed." }
</examples>`,
  {
    projectName: z.string().describe('Notification title'),
    message: z.string().describe('Notification body'),
  },
  async ({ projectName, message }) => {
    // send OS notification
    notifier.notify({ title: projectName, message, wait: true });
    return { content: [{ type: 'text', text: 'Message complete.' }] };
  },
);

// Start Intensive Chat: Opens a persistent console for continuous user interaction
server.tool(
  'start_intensive_chat',
  `<description>
  Start an intensive chat session for gathering multiple answers quickly from the user.
  **Highly recommended** for scenarios requiring a sequence of related inputs or confirmations.
  Very useful for gathering multiple answers from the user in a short period of time.
  Especially useful for brainstorming ideas or discussing complex topics with the user.
</description>

<importantNotes>
- (!important!) Opens a persistent console window that stays open for multiple questions.
- (!important!) Returns a session ID that **must** be used for subsequent questions via 'ask_intensive_chat'.
- (!important!) **Must** be closed with 'stop_intensive_chat' when finished gathering all inputs.
- (!important!) After starting a session, **immediately** continue asking all necessary questions using 'ask_intensive_chat' within the **same response message**. Do not end the response until the chat is closed with 'stop_intensive_chat'. This creates a seamless conversational flow for the user.
</importantNotes>

<whenToUseThisTool>
- When you need to collect a series of quick answers from the user (more than 2-3 questions)
- When setting up a project with multiple configuration options
- When guiding a user through a multi-step process requiring input at each stage
- When gathering sequential user preferences
- When you want to maintain context between multiple related questions efficiently
- When brainstorming ideas with the user interactively
</whenToUseThisTool>

<features>
- Opens a persistent console window for continuous interaction
- Supports starting with an initial question
- Configurable timeout for each question (set via -t/--timeout, defaults to ${globalTimeoutSeconds} seconds)
- Returns a session ID for subsequent interactions
- Keeps full chat history visible to the user
- Maintains state between questions
</features>

<bestPractices>
- Use a descriptive session title related to the task
- Start with a clear initial question when possible
- Always store the returned session ID for later use
- Always close the session when you're done with stop_intensive_chat
</bestPractices>

<parameters>
- sessionTitle: Title for the intensive chat session (appears at the top of the console)
</parameters>

<examples>
- Start session for project setup: { "sessionTitle": "Project Configuration" }
</examples>`,
  {
    sessionTitle: z.string().describe('Title for the intensive chat session'),
  },
  async ({ sessionTitle }) => {
    try {
      // Start a new intensive chat session, passing global timeout
      const sessionId = await startIntensiveChatSession(
        sessionTitle,
        globalTimeoutSeconds,
      );

      // Track this session for the client
      activeChatSessions.set(sessionId, sessionTitle);

      return {
        content: [
          {
            type: 'text',
            text: `Intensive chat session started successfully. Session ID: ${sessionId}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error starting intensive chat session:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to start intensive chat session: ${(error as any)?.message || 'unknown error'}`,
          },
        ],
      };
    }
  },
);

// Ask in Intensive Chat: Adds a question to an existing chat session
server.tool(
  'ask_intensive_chat',
  `<description>
  Ask a new question in an active intensive chat session previously started with 'start_intensive_chat'.
</description>

<importantNotes>
- (!important!) Requires a valid session ID from 'start_intensive_chat'.
- (!important!) Supports predefined options for quick selection.
- (!important!) Returns the user's answer or indicates if they didn't respond.
- (!important!) **Use this repeatedly within the same response message** after 'start_intensive_chat' until all questions are asked.
</importantNotes>

<whenToUseThisTool>
- When continuing a series of questions in an intensive chat session.
- When you need the next piece of information in a multi-step process initiated via 'start_intensive_chat'.
- When offering multiple choice options to the user within the session.
- When gathering sequential information from the user within the session.
</whenToUseThisTool>

<features>
- Adds a new question to an existing chat session
- Supports predefined options for quick selection
- Returns the user's response
- Maintains the chat history in the console
</features>

<bestPractices>
- Ask one clear question at a time
- Provide predefined options when applicable
- Don't ask overly complex questions
- Keep questions focused on a single piece of information
</bestPractices>

<parameters>
- sessionId: ID of the intensive chat session (from start_intensive_chat)
- question: The question text to display to the user
- predefinedOptions: Array of predefined options for the user to choose from (optional)
</parameters>

<examples>
- Simple question: { "sessionId": "abcd1234", "question": "What is your project named?" }
- With predefined options: { "sessionId": "abcd1234", "question": "Would you like to use TypeScript?", "predefinedOptions": ["Yes", "No"] }
</examples>`,
  {
    sessionId: z.string().describe('ID of the intensive chat session'),
    question: z.string().describe('Question to ask the user'),
    predefinedOptions: z
      .array(z.string())
      .optional()
      .describe('Predefined options for the user to choose from (optional)'),
  },
  async ({ sessionId, question, predefinedOptions }) => {
    // Check if session exists
    if (!activeChatSessions.has(sessionId)) {
      return {
        content: [
          { type: 'text', text: 'Error: Invalid or expired session ID.' },
        ],
      };
    }

    try {
      // Ask the question in the session
      const answer = await askQuestionInSession(
        sessionId,
        question,
        predefinedOptions,
      );

      // Check for the specific timeout indicator
      if (answer === '__TIMEOUT__') {
        return {
          content: [
            {
              type: 'text',
              text: 'User did not reply to question in intensive chat: Timeout occurred.',
            },
          ],
        };
      }
      // Empty string means user submitted empty input, non-empty is actual reply
      else if (answer === '') {
        return {
          content: [
            {
              type: 'text',
              text: 'User replied with empty input in intensive chat.',
            },
          ],
        };
      } else {
        return {
          content: [{ type: 'text', text: `User replied: ${answer}` }],
        };
      }
    } catch (error) {
      console.error('Error asking question in intensive chat:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to ask question: ${(error as any)?.message || 'unknown error'}`,
          },
        ],
      };
    }
  },
);

// Stop Intensive Chat: Closes the chat session
server.tool(
  'stop_intensive_chat',
  `<description>
  Stop and close an active intensive chat session. **Must be called** after all questions have been asked using 'ask_intensive_chat'.
</description>

<importantNotes>
- (!important!) Closes the console window for the intensive chat.
- (!important!) Frees up system resources.
- (!important!) **Should always be called** as the final step when finished with an intensive chat session, typically at the end of the response message where 'start_intensive_chat' was called.
</importantNotes>

<whenToUseThisTool>
- When you've completed gathering all needed information via 'ask_intensive_chat'.
- When the multi-step process requiring intensive chat is complete.
- When you're ready to move on to processing the collected information.
- When the user indicates they want to end the session (if applicable).
- As the final action related to the intensive chat flow within a single response message.
</whenToUseThisTool>

<features>
- Gracefully closes the console window
- Cleans up system resources
- Marks the session as complete
</features>

<bestPractices>
- Always stop sessions when you're done to free resources
- Provide a summary of the information collected before stopping
</bestPractices>

<parameters>
- sessionId: ID of the intensive chat session to stop
</parameters>

<examples>
- { "sessionId": "abcd1234" }
</examples>`,
  {
    sessionId: z.string().describe('ID of the intensive chat session to stop'),
  },
  async ({ sessionId }) => {
    // Check if session exists
    if (!activeChatSessions.has(sessionId)) {
      return {
        content: [
          { type: 'text', text: 'Error: Invalid or expired session ID.' },
        ],
      };
    }

    try {
      // Stop the session
      const success = await stopIntensiveChatSession(sessionId);

      // Remove from active sessions
      if (success) {
        activeChatSessions.delete(sessionId);
      }

      return {
        content: [
          {
            type: 'text',
            text: success
              ? 'Intensive chat session closed successfully.'
              : 'Failed to close intensive chat session. It may have already ended.',
          },
        ],
      };
    } catch (error) {
      console.error('Error stopping intensive chat session:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to stop chat session: ${(error as any)?.message || 'unknown error'}`,
          },
        ],
      };
    }
  },
);

// Run the server over stdio
const transport = new StdioServerTransport();
await server.connect(transport);
