# interactive-mcp

[![npm version](https://img.shields.io/npm/v/interactive-mcp)](https://www.npmjs.com/package/interactive-mcp) [![npm downloads](https://img.shields.io/npm/dm/interactive-mcp)](https://www.npmjs.com/package/interactive-mcp) [![GitHub license](https://img.shields.io/github/license/ttommyth/interactive-mcp)](https://github.com/ttommyth/interactive-mcp/blob/main/LICENSE) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier) [![Platforms](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/ttommyth/interactive-mcp) [![GitHub last commit](https://img.shields.io/github/last-commit/ttommyth/interactive-mcp)](https://github.com/ttommyth/interactive-mcp/commits/main)

A MCP Server implemented in Node.js/TypeScript, facilitating interactive communication between LLMs and users. **Note:** This server is designed to run locally alongside the MCP client (e.g., Claude Desktop, VS Code), as it needs direct access to the user's operating system to display notifications and command-line prompts.

_(Note: This project is in its early stages.)_

**Want a quick overview?** Check out the introductory blog post: [Stop Your AI Assistant From Guessing — Introducing interactive-mcp](https://medium.com/@ttommyth/stop-your-ai-assistant-from-guessing-introducing-interactive-mcp-b42ac6d9b0e2)

## Features

- **Interactive Prompts:** Ask users questions via OS notifications or a dedicated command prompt.
- **Simple Notifications:** Send informational messages to the user's OS.
- **Intensive Chat:** Initiate persistent command-line chat sessions for multi-turn interactions.
- **Cross-Platform:** Designed to work on Windows, macOS, and Linux (leveraging `node-notifier`).
- **Customizable Timeout:** Set a custom timeout for user prompts (default: 30 seconds) using the `-t` or `--timeout` flag.

## Tools

This server exposes the following tools via the Model Context Protocol (MCP):

- `request_user_input`: Asks the user a question and returns their answer. Can display predefined options.
- `message_complete_notification`: Sends a simple OS notification.
- `start_intensive_chat`: Initiates a persistent command-line chat session.
- `ask_intensive_chat`: Asks a question within an active intensive chat session.
- `stop_intensive_chat`: Closes an active intensive chat session.

## Usage Scenarios

This server is ideal for scenarios where an LLM needs to interact directly with the user on their local machine, such as:

- Interactive setup or configuration processes.
- Gathering feedback during code generation or modification.
- Clarifying instructions or confirming actions in pair programming.
- Any workflow requiring user input or confirmation during LLM operation.

## Client Configuration

This section explains how to configure MCP clients to use the `interactive-mcp` server.

By default, user prompts will time out after 30 seconds. You can change this by adding the timeout flag (`-t <seconds>` or `--timeout <seconds>`) to the `args` array after `"--"` when configuring your client.

Please make sure you have the `npx` command available.

### Usage with Claude Desktop / Cursor

Add the following minimal configuration to your `claude_desktop_config.json` (Claude Desktop) or `mcp.json` (Cursor):

```json
{
  "mcpServers": {
    "interactive": {
      "command": "npx",
      "args": ["-y", "interactive-mcp"]
    }
  }
}
```

**Example with Custom Timeout (60 seconds):**

```json
{
  "mcpServers": {
    "interactive": {
      "command": "npx",
      "args": ["-y", "interactive-mcp", "--", "-t", "60"]
    }
  }
}
```

### Usage with VS Code

Add the following minimal configuration to your User Settings (JSON) file or `.vscode/mcp.json`:

```json
{
  "mcp": {
    "servers": {
      "interactive-mcp": {
        "command": "npx",
        "args": ["-y", "interactive-mcp"]
      }
    }
  }
}
```

#### macOS Recommendations

For a smoother experience on macOS using the default `Terminal.app`, consider these profile settings:

- **(Shell Tab):** Under **"When the shell exits"** (**Terminal > Settings > Profiles > _[Your Profile]_ > Shell**), select **"Close if the shell exited cleanly"** or **"Close the window"**. This helps manage windows when the MCP server starts and stops.
- **(Advanced Tab):** Under **Input** (**Terminal > Settings > Profiles > _[Your Profile]_ > Advanced**), uncheck the option **"Delete sends Control-H"**. By default, macOS Terminal sends Control-H (ASCII Backspace) when you press Delete. Unchecking this might help in applications that expect a different sequence, though achieving a specific sequence like `\033[3~` (often needed for forward delete) might still require other configurations or terminal alternatives.

## Demo

Here's a demonstration of the interactive features (chat and prompts):

[![Interactive Demo Video](https://img.youtube.com/vi/ebwDZdfgSHo/hqdefault.jpg)](https://youtu.be/ebwDZdfgSHo)

Here's a demonstration of the completion notification:

[![Completion Notification Demo Video](https://img.youtube.com/vi/A7V5Qd56QPU/hqdefault.jpg)](https://youtu.be/A7V5Qd56QPU)

## Development Setup

This section is primarily for developers looking to modify or contribute to the server. If you just want to _use_ the server with an MCP client, see the "Client Configuration" section above.

### Prerequisites

- **Node.js:** Check `package.json` for version compatibility.
- **pnpm:** Used for package management. Install via `npm install -g pnpm` after installing Node.js.

### Installation (Developers)

1. Clone the repository:

   ```bash
   git clone https://github.com/ttommyth/interactive-mcp.git
   cd interactive-mcp
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

### Running the Application (Developers)

```bash
pnpm start
```

To run with a custom timeout (e.g., 60 seconds), pass the arguments after `--`:

```bash
pnpm start -- -t 60
# or
pnpm start -- --timeout 60
```

## Development Commands

- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Format:** `pnpm format`

## Guiding Principles for Interaction

When interacting with this MCP server (e.g., as an LLM client), please adhere to the following principles to ensure clarity and reduce unexpected changes:

- **Prioritize Interaction:** Utilize the provided MCP tools (`request_user_input`, `start_intensive_chat`, etc.) frequently to engage with the user.
- **Seek Clarification:** If requirements, instructions, or context are unclear, **always** ask clarifying questions before proceeding. Do not make assumptions.
- **Confirm Actions:** Before performing significant actions (like modifying files, running complex commands, or making architectural decisions), confirm the plan with the user.
- **Provide Options:** Whenever possible, present the user with predefined options through the MCP tools to facilitate quick decisions.

You can provide these instructions to an LLM client like this:

```markdown
# Interaction

- Please use the interactive MCP tools
- Please provide options to interactive MCP if possible

# Reduce Unexpected Changes

- Do not make assumption.
- Ask more questions before executing, until you think the requirement is clear enough.
```

## Contributing

Contributions are welcome! Please follow standard development practices. (Further details can be added later).

## License

MIT (See `LICENSE` file for details - if applicable, or specify license directly).
