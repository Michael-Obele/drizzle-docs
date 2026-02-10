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
2. **Install dependencies**: `bun install` or `npm install`.
3. **Make your changes**. Ensure your code follows the existing style.
4. **Test your changes**: Run `npm run check` to verify TypeScript compilation.
5. **Submit a Pull Request** with a clear description of what you've changed and why.

## Development Setup

### Commands
- `npm run dev` - Start Mastra Studio at localhost:4111.
- `npm run check` - Verify TypeScript compilation.
- `npm run build` - Bundle the production-ready application.
- `npm run mcp` - Run the MCP server locally with TS support.

## Code Style
- Use TypeScript for all logic.
- Follow the patterns in `src/mastra/tools` for adding new tools.
- Ensure all input/output schemas are defined using `zod`.

## Community
By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?
If you have any questions, please reach out to `support@svelte-apps.me`.
