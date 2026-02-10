# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-10

### Added
- **Production-grade Documentation**: Complete overhaul of `README.md` with Cursor install deep-links and deployment guides.
- **Repository Standards**: Added `CODE_OF_CONDUCT.md`, `LICENSE` (MIT), `CONTRIBUTING.md`, and `SECURITY.md`.
- **Architecture Guide**: Added `MCP_ARCHITECTURE.md` explaining the Mastra-based design.
- **Smart Caching**: Implemented startup pre-caching for all 97 Drizzle documentation pages.
- **Improved Search**: Added high-sensitivity fuzzy search powered by `fuse.js`.
- **Versioning System**: Added automated version synchronization scripts and GitHub release workflows.

### Changed
- Refined contact information to use dedicated `@svelte-apps.me` addresses.
- Updated MCP server version to 2.0.0 to reflect production readiness.

## [1.0.0] - 2026-01-15

### Added
- Initial implementation of Drizzle Docs MCP server.
- Basic tools for listing and fetching documentation.
- Mastra framework integration.
