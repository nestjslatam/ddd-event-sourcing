# Versioning and Release Guide

## 🎯 Overview

This project uses **Semantic Versioning** (semver) with automated releases via GitHub Actions.

**Current Version:** 1.0.0

---

## 📝 Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) for automated changelog generation and version bumping.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type              | Description             | Version Bump  |
| ----------------- | ----------------------- | ------------- |
| `feat`            | New feature             | Minor (0.x.0) |
| `fix`             | Bug fix                 | Patch (0.0.x) |
| `docs`            | Documentation only      | None          |
| `style`           | Code style changes      | None          |
| `refactor`        | Code refactoring        | None          |
| `perf`            | Performance improvement | Patch         |
| `test`            | Adding tests            | None          |
| `chore`           | Maintenance             | None          |
| `BREAKING CHANGE` | Breaking change         | Major (x.0.0) |

### Examples

```bash
# Feature (minor bump)
git commit -m "feat(sagas): add AccountTransferSaga for workflow orchestration"

# Bug fix (patch bump)
git commit -m "fix(snapshots): correct snapshot loading logic"

# Documentation (no bump)
git commit -m "docs(readme): update Phase 2 features section"

# Breaking change (major bump)
git commit -m "feat(api): redesign EventStore interface

BREAKING CHANGE: EventStore.persist() now returns Promise<void> instead of Promise<string>"
```

---

## 🚀 Creating a Release

### Automated Release (Recommended)

1. **Go to GitHub Actions**
2. **Select "Release" workflow**
3. **Click "Run workflow"**
4. **Choose release type:**
   - `patch` - Bug fixes (1.0.0 → 1.0.1)
   - `minor` - New features (1.0.0 → 1.1.0)
   - `major` - Breaking changes (1.0.0 → 2.0.0)

The workflow will:

- Run all tests
- Build the library
- Bump version in `package.json`
- Generate changelog
- Create git tag
- Create GitHub release
- Publish to npm (if NPM_TOKEN configured)

### Manual Release

```bash
# Dry run (see what would happen)
npm run release:dry-run

# Create patch release
npm run release:patch

# Create minor release
npm run release:minor

# Create major release
npm run release:major

# Push changes
git push --follow-tags origin main
```

---

## 📋 Changelog

The changelog is automatically generated from commit messages.

**View:** [CHANGELOG.md](../CHANGELOG.md)

**Update manually:**

```bash
npm run changelog
```

---

## 🔍 Version Bumping Rules

### Patch (0.0.x)

- Bug fixes
- Performance improvements
- Documentation updates
- Internal refactoring

### Minor (0.x.0)

- New features
- New APIs
- Backward-compatible changes

### Major (x.0.0)

- Breaking changes
- API redesigns
- Incompatible updates

---

## 🧪 Testing a Release

### Dry Run

```bash
npm run release:dry-run
```

This shows:

- What version would be bumped to
- What commits would be included
- What changelog would be generated

### Local Testing

1. Create a test branch
2. Run release command
3. Verify changes
4. Delete branch if not satisfied

---

## 📦 npm Publishing

### Setup

1. **Create npm account** at [npmjs.com](https://www.npmjs.com/)
2. **Generate access token** in npm settings
3. **Add to GitHub secrets:**
   - Go to repository Settings → Secrets
   - Add secret named `NPM_TOKEN`
   - Paste your npm token

### Publishing

Publishing happens automatically when a release is created (if NPM_TOKEN is configured).

**Manual publish:**

```bash
npm run build:lib
cd dist/libs/es
npm publish --access public
```

---

## 📚 Documentation Deployment

Documentation is automatically deployed to GitHub Pages when:

- A release is created
- Changes are pushed to `docs/` folder
- Manual workflow dispatch

**View docs:** https://nestjslatam.github.io/ddd-event-sourcing

---

## ✅ Pre-release Checklist

Before creating a release:

- [ ] All tests passing
- [ ] Build succeeds
- [ ] Documentation updated
- [ ] CHANGELOG reviewed
- [ ] Breaking changes documented
- [ ] Migration guide created (if needed)

---

## 🔄 Workflow Overview

### On Every Commit

1. Pre-commit hook validates commit message
2. Runs linting and tests

### On Pull Request

1. Validation workflow runs
2. All tests must pass
3. Build must succeed

### On Release

1. Tests run
2. Library builds
3. Version bumps
4. Changelog generates
5. Git tag creates
6. GitHub release creates
7. npm publishes (optional)
8. Documentation deploys

---

## 🛠️ Troubleshooting

### Commit message rejected

```bash
# Error: commit message doesn't follow convention
# Fix: Use correct format
git commit -m "feat(scope): description"
```

### Release fails

1. Check GitHub Actions logs
2. Verify all tests pass
3. Ensure no uncommitted changes
4. Check npm token if publishing

### Version conflict

```bash
# Pull latest changes
git pull origin main

# Retry release
npm run release
```

---

## 📖 Resources

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [standard-version](https://github.com/conventional-changelog/standard-version)
