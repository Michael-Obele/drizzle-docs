# Contributing to drizzle-docs-mcp

Thank you for your interest in contributing to the Drizzle ORM Docs MCP! Contributions are what make the open-source community such an amazing place to learn, inspire, and create.

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please open an issue and include:

- A clear description of the problem.
- Steps to reproduce the issue.
- Expected vs. actual behavior.
- Environment details (Node.js version, OS, Editor).

### Suggesting Enhancements

We welcome ideas for new features or improvements. Please open an issue to discuss your ideas before starting work.

### Pull Requests

1. **Fork the repository** and create your branch from `main`.
2. **Install dependencies**: `bun install`.
3. **Make your changes**. Ensure your code follows the existing style.
4. **Test your changes**: Run `bun run check` (types) and `bun test` (tests).
5. **Submit a Pull Request** with a clear description of what you've changed and why.

## Development Setup

### Commands

- `bun run dev` - Run the MCP server on stdio in watch mode.
- `bun run dev:http` - Same, but serve Streamable HTTP at `localhost:3000/mcp`.
- `bun run check` - Verify TypeScript compilation (`tsc --noEmit`).
- `bun test` - Run the test suite.
- `bun run build` - Emit `dist/`, which is what npm publishes.

## Code Style

- Use TypeScript for all logic.
- Follow the pattern in `src/tools/` for adding new tools: a module-level `zod`
  schema, registered with `server.tool<typeof schema>(...)`, returning results
  from `src/tools/result.ts`.
- Keep configuration in `src/lib/config.ts` (env-driven) instead of hardcoding
  hosts or resource lists in the code.

## Community

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

If you have any questions, please reach out to `contrib@svelte-apps.me`.
