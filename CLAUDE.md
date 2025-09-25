# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `interactive-mcp` - an MCP (Model Context Protocol) server that enables interactive communication between LLMs and users. It's built with Node.js/TypeScript and provides tools for:

- **User Input Requests**: Ask users questions with optional predefined answers
- **OS Notifications**: Send system notifications to users
- **Intensive Chat Sessions**: Create persistent command-line chat interfaces

The project is an enhanced fork of the original with improvements like auto-pause timers and silent logging.

## Architecture

The codebase follows a modular structure:

- **Entry Point**: `src/index.ts` - Main server setup with MCP tool registrations
- **Tool Definitions**: `src/tool-definitions/` - Contains schema and capability definitions for each MCP tool
- **Commands**: `src/commands/` - Implementation of interactive features (input prompts, intensive chat)
- **Utils**: `src/utils/` - Shared utilities (logging)
- **Constants**: `src/constants.ts` - Global configuration values

### Key Design Patterns

- **Tool Definition Pattern**: Each MCP tool has separate schema/capability definitions in `tool-definitions/` and implementation in `commands/`
- **Conditional Tool Registration**: Tools can be disabled via command-line flags using `--disable-tools`
- **Session Management**: Intensive chat sessions are tracked in a Map with session IDs

## Development Commands

```bash
# Build the project (TypeScript compilation + path aliases)
npm run build

# Start the MCP server
npm start

# Lint code
npm run lint

# Format code
npm run format

# Type checking without emission
npm run check-types
```

## Testing

This project currently has no test suite. Tests would typically be added as `*.test.ts` files alongside source files.

## MCP Server Configuration

The server supports several command-line options:

- `--timeout/-t <seconds>`: Set default timeout for user prompts (default: 60s from USER_INPUT_TIMEOUT_SECONDS)
- `--disable-tools/-d <tools>`: Comma-separated list of tools to disable

Example client configuration:

```json
{
  "mcpServers": {
    "interactive": {
      "command": "npx",
      "args": ["-y", "interactive-mcp", "-t", "30"]
    }
  }
}
```

## Key Dependencies

- `@modelcontextprotocol/sdk`: Core MCP server functionality
- `@inkjs/ui` + `ink` + `react`: Command-line UI framework for interactive prompts
- `node-notifier`: OS notifications
- `yargs`: Command-line argument parsing
- `pino`: Structured logging

## Important Implementation Details

- All user interactions happen through the terminal/command-line interface
- The server uses stdio transport for MCP communication
- Timeout handling returns special `__TIMEOUT__` strings that are converted to user-friendly messages
- Path aliases (`@/*` → `src/*`) are configured in tsconfig.json and resolved with tsc-alias during build
