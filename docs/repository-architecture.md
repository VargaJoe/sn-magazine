# Project Structure and Repository Strategy

## Overview
This document explains the recommended architecture and repository strategy for your React-based website builder powered by Sense/Net ECM. The goal is to keep the core builder generic and reusable, while each site has its own repository for site-specific features and configuration.

---

## 1. Repository Structure

### A. Core Builder Repository (this repository)
- Contains only the generic website builder code, layout engine, widget system, and Sense/Net ECM integration.
- No site-specific widgets, branding, or configuration.
- Example branches:
  - `main` (stable releases)
  - `develop` (active development)
  - `feature/*` (feature branches)

### B. Site-Specific Repositories
- Each site has its own repository.
- Depends on the core builder (as a git submodule, npm package, or monorepo package).
- Contains only site-specific widgets, layouts, configuration, and branding.
- Example branches:
  - `main` (production)
  - `develop` (site-specific development)
  - `feature/*` (site-specific features)

---

## 2. Workflow

1. **Develop core features** in the core builder repo (this repository).
2. **Release a new version** of the core builder.
3. **Update site repos** to use the latest core builder version.
4. **Add or modify site-specific features** in each site repo as needed.
5. **Deploy sites** independently.

---

## 3. Referencing the Core Builder in Site Projects

There are several ways to reference the core builder from site-specific repositories:

### Option 1: Git Submodule
- Add the core builder repo as a submodule in the site repo.
- Import core components/widgets using relative paths.
- Example:
  ```sh
  git submodule add <core-builder-repo-url> core-builder
  ```
- In your site project, import from the submodule, e.g.:
  ```js
  import { Widget } from '../core-builder/src/widgets/Widget';
  ```

### Option 2: Local NPM Package (Recommended for React Projects)
- Build the core builder as a local npm package (e.g., using `npm pack`).
- In the site repo, install the core builder package:
  ```sh
  npm install ../path-to-core-builder
  ```
- Or publish the core builder to a private npm registry and install via:
  ```sh
  npm install @your-org/core-builder
  ```
- Then import in your site code:
  ```js
  import { Widget } from 'core-builder';
  ```

### Option 3: Monorepo (Advanced)
- Use a monorepo tool (like Yarn Workspaces or Lerna) to manage both core and site packages in a single repository.
- This is more advanced and best for large teams or many sites.

---

## 4. Migration Steps
1. Clean this repository to contain only generic code (core builder).
2. For each site, create a new repository and add the core builder as a dependency (using one of the methods above).
3. Add only the site-specific widgets, layouts, and configuration to each site repo.
4. Document the process for future contributors.

---

## 5. Example Directory Structure

```
core-builder/
  src/
    components/
    widgets/
    ...
  package.json
  README.md

site-project/
  src/
    custom-widgets/
    custom-layouts/
    config.json
  package.json
  README.md
  (depends on core-builder)
```

---

## 6. Notes
- Use configuration and content operations to build and manage sites after deployment—no code changes needed for content updates.
- Site-specific repos can override or extend core widgets/layouts as needed.
- Keep documentation up to date in each repo.

---

## 7. Summary
- **Core builder:** This repo, generic, reusable.
- **Each site:** Separate repo, only site-specific code/config.
- **Result:** Clean, maintainable, and scalable architecture.
