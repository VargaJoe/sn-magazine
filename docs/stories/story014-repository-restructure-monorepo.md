# Story 014: Repository Restructure and Monorepo Migration

## Context
The project has evolved from a site-specific magazine/blog to a generic React-based website builder powered by Sense/Net ECM. To support multiple independent sites and ensure maintainability, we need to separate core builder functionality from site-specific code. The goal is to enable clean separation, easier upgrades, and scalable site management.

## Plan
- Merge all current work back to the master branch to consolidate history and features.
- Keep the current production/live branch for ongoing deployments until the restructure is complete.
- Systematically refactor the master branch to extract only generic, reusable builder code (core builder).
- Prepare for a monorepo structure as the first step, so both the core builder and site-specific projects can be managed in a single repository initially.
- Document the process and migration steps for future contributors.
- After validation, consider splitting site projects into separate repositories if/when needed.

## Tasks
- [ ] Merge all feature and site branches back to master for a clean starting point.
- [ ] Retain the current production branch for uninterrupted live deployments.
- [ ] Refactor master to contain only generic builder code (no site-specific widgets, layouts, or configs).
- [ ] Set up a monorepo structure (e.g., using Yarn Workspaces or Lerna) with at least two packages:
    - `core-builder` (generic builder)
    - `site-project` (site-specific code, can be duplicated for each site)
- [ ] Move site-specific code into its own package(s) within the monorepo.
- [ ] Update documentation to reflect the new structure and workflow.
- [ ] Test that both core and site packages build and run correctly.
- [ ] Plan for future separation into independent repositories if needed.

## Notes
- Prioritize this story when ready to begin the restructure.
- Use the monorepo approach to simplify the initial migration and avoid breaking production during the transition.
- Document all steps and decisions for transparency and future reference.
