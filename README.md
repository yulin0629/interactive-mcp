# interactive-mcp

A MCP Server implemented in Node.js/TypeScript, facilitating interactive communication between LLMs and users.

_(Note: This project is in its early stages.)_

## Key Technologies

- Node.js
- TypeScript
- node-notifier
- Ink
- React
- Zod
- pnpm

## Getting Started

### Prerequisites

- Node.js (Check `package.json` for version compatibility)
- pnpm

### Installation

1. Clone the repository:

   ```bash
   git clone <your-repo-url>
   cd interactive-mcp
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

### Running the Application

```bash
pnpm start
```

## Usage

This server acts as a bridge between a Large Language Model (LLM) and the user's local environment. It exposes several tools via the Model Context Protocol (MCP) that the LLM can call:

- `request_user_input`: Asks the user a question via an OS notification or command prompt and returns their answer.
- `message_complete_notification`: Sends a simple OS notification to the user.
- `start_intensive_chat`: Initiates a persistent command-line chat session for multiple questions.
- `ask_intensive_chat`: Asks a question within an active intensive chat session.
- `stop_intensive_chat`: Closes an active intensive chat session.

An LLM client connects to this server (running locally) typically via standard input/output and invokes these tools as needed during its operation. The server handles the user interaction details.

**(Example client interaction details could be added here if available)**

## Demo

Here's a demonstration of the intensive chat feature:

![Intensive Chat Demo](path/to/your/intensive-chat-demo.gif)

_(Explanation of the demo steps could be added here)_

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

## Development

- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Format:** `pnpm format`

## Contributing

Contributions are welcome! Please follow standard development practices. (Further details can be added later).

## License

MIT (See `LICENSE` file for details - if applicable, or specify license directly).
