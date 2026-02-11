# CI/CD and Git Hooks - Setup Guide

## 🎯 What's Been Configured

This project now has automated quality checks via:

- **Husky** - Git hooks for pre-commit validation
- **lint-staged** - Run linters only on staged files
- **GitHub Actions** - Automated CI/CD pipeline

---

## 🔧 Local Development

### Pre-commit Hooks

Every time you commit, the following checks run automatically:

1. **Lint Staged Files** - ESLint with auto-fix
2. **Format Check** - Prettier formatting
3. **Type Check** - TypeScript compilation
4. **Run Tests** - Jest tests for changed files

**To bypass** (not recommended):

```bash
git commit --no-verify
```

### Available Scripts

```bash
# Validate everything locally
npm run validate

# Fix linting issues
npm run lint:fix

# Check formatting
npm run format:check

# Auto-format files
npm run format:write

# Type check without building
npm run type-check

# Test only staged files
npm run test:staged
```

---

## 🚀 GitHub Actions CI/CD

### CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:**

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**

1. **Lint** - ESLint validation
2. **Type Check** - TypeScript compilation
3. **Test** - Full test suite on Node 18.x and 20.x
4. **Build** - Production build verification

**All jobs must pass** before merging PRs.

### Release Workflow (`.github/workflows/release.yml`)

**Triggers:**

- Manual workflow dispatch
- Git tags (v\*)

**Features:**

- Automated changelog generation
- GitHub release creation
- Optional npm publishing (commented out)

**To create a release:**

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## 📋 What Gets Checked

### Pre-commit (Local)

- ✅ Lint staged TypeScript files
- ✅ Format staged files
- ✅ Type check entire project
- ✅ Run tests for changed files

### CI Pipeline (GitHub)

- ✅ Lint all files
- ✅ Type check all files
- ✅ Run all tests (Node 18.x, 20.x)
- ✅ Build production bundle
- ✅ Generate coverage report

---

## 🛠️ Configuration Files

### `.husky/pre-commit`

Pre-commit hook script that runs checks before allowing commits.

### `.lintstagedrc.json`

Configuration for lint-staged:

```json
{
  "*.ts": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml,yaml}": ["prettier --write"]
}
```

### `.github/workflows/ci.yml`

Main CI pipeline with lint, test, and build jobs.

### `.github/workflows/release.yml`

Automated release workflow with changelog generation.

---

## 🎓 Best Practices

### For Developers

1. **Run `npm run validate` before pushing**
2. **Fix linting issues immediately**
3. **Keep commits small and focused**
4. **Write tests for new features**
5. **Update documentation**

### For Reviewers

1. **Check CI status before reviewing**
2. **Verify all tests pass**
3. **Review coverage reports**
4. **Ensure build succeeds**

---

## 🔍 Troubleshooting

### Pre-commit hook fails

```bash
# Check what's failing
npm run validate

# Fix linting
npm run lint:fix

# Fix formatting
npm run format:write

# Check types
npm run type-check
```

### CI fails on GitHub

1. Check the Actions tab
2. Review failed job logs
3. Fix issues locally
4. Push again

### Husky not working

```bash
# Reinstall husky
npm run prepare

# Make hook executable
chmod +x .husky/pre-commit
```

---

## 📊 Coverage Reports

Coverage reports are generated on CI and uploaded to Codecov (if configured).

**To view locally:**

```bash
npm run test:cov
open coverage/lcov-report/index.html
```

---

## 🚀 Next Steps

1. **Test the setup** - Make a commit and verify hooks run
2. **Push to GitHub** - Verify CI pipeline runs
3. **Create a PR** - Test the full workflow
4. **Configure Codecov** - Add `CODECOV_TOKEN` to GitHub secrets (optional)
5. **Set up npm publishing** - Add `NPM_TOKEN` to GitHub secrets (optional)

---

## ✅ Quality Gates

Before code can be merged:

- ✅ All linting passes
- ✅ All tests pass
- ✅ Build succeeds
- ✅ Type checking passes
- ✅ Code is formatted correctly
- ✅ Coverage meets threshold

**This ensures high code quality and prevents broken code from reaching production!**
