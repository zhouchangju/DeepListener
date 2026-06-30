#!/bin/bash
# Pre-commit quality gate for DeepListener
# Runs lint and targeted tests on staged files before allowing commit.
#
# Install manually:
#   ln -sf ../../.agents/hooks/pre-commit-quality-gate.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit

set -euo pipefail

echo "Running pre-commit quality gate..."

# Run lint
echo "→ Lint check..."
if ! npm run lint; then
  echo "❌ Lint failed. Fix lint issues before committing."
  exit 1
fi

# Run tests if there are staged test files or source files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
STAGED_TESTS=$(echo "$STAGED_FILES" | grep -E '\.(test\.ts|test\.tsx)$' || true)
STAGED_SRC=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx)$' | grep -v '\.test\.' || true)

if [ -n "$STAGED_TESTS" ]; then
  echo "→ Running staged tests..."
  for test_file in $STAGED_TESTS; do
    if [ -f "$test_file" ]; then
      echo "  Testing: $test_file"
      node --import tsx --test "$test_file" || {
        echo "❌ Test failed: $test_file"
        exit 1
      }
    fi
  done
fi

echo "✅ Pre-commit quality gate passed."
