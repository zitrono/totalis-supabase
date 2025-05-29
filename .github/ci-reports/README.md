# CI/CD Error Reporting

This directory contains templates and documentation for the CI/CD error reporting system.

## Overview

The CI/CD pipeline uses a progressive reporting system that:
- Updates a PR comment in real-time as jobs complete
- Collects detailed error information
- Provides actionable solutions for common issues

## Structure

- `error-schema.json` - Schema for error report format
- `common-errors.md` - Knowledge base of common errors and solutions
- `.gitignore` - Ensures actual reports aren't committed

## How It Works

1. Each job reports its status using the `update-status` action
2. The status is posted/updated in a PR comment
3. Errors are collected and formatted with helpful context
4. A final summary provides an overview of the entire run

## Viewing Reports

Reports appear as:
- **PR Comments** - Real-time updates during CI/CD runs
- **GitHub Artifacts** - Detailed logs for each job
- **Check Annotations** - Inline errors in the PR diff

## Common Error Patterns

See `common-errors.md` for solutions to frequently encountered issues.