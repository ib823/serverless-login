#!/usr/bin/env bash
set -euo pipefail

DESC="${1:-latest sync for Claude}"

# --- figure out default branch (main/master) ---
DEFAULT_BRANCH="$(git remote show origin 2>/dev/null | sed -n '/HEAD branch/s/.*: //p' || true)"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

# --- make a fresh feature branch name ---
AUTO_BRANCH="feat/sync-$(date -u +%Y%m%d-%H%M%S)"

echo "Default branch: $DEFAULT_BRANCH"
echo "Working branch: $AUTO_BRANCH"

git fetch origin --prune

# --- create/switch to feature branch ---
git switch "$AUTO_BRANCH" 2>/dev/null || git switch -c "$AUTO_BRANCH"

# --- optional build; never block push if it fails ---
if [ -f package.json ] && grep -q '"build"\s*:' package.json; then
  echo "Build detected in package.json -> running build (non-blocking)"
  set +e
  PM=""
  if command -v pnpm >/dev/null 2>&1; then PM=pnpm
  elif command -v yarn >/dev/null 2>&1; then PM=yarn
  elif command -v bun  >/dev/null 2>&1; then PM=bun
  else PM=npm; fi
  # prefer npm if lockfile exists
  [ -f package-lock.json ] && PM=npm
  $PM run build
  echo "Build exit code: $? (continuing regardless)"
  set -e
fi

# --- commit everything ---
git add -A
git commit -m "chore(sync): ${DESC} @ $(date -u +'%Y-%m-%d %H:%M:%S UTC')" || true

# --- try to rebase the branch on latest default (best chance for clean merge) ---
git fetch origin
if ! git rebase "origin/$DEFAULT_BRANCH"; then
  echo "Rebase conflict -> aborting rebase and proceeding without it."
  git rebase --abort || true
fi

# --- push feature branch so Claude can fetch regardless of merge outcome ---
git push -u origin HEAD

SHORT_SHA="$(git rev-parse --short HEAD)"
echo "Pushed feature branch commit: $SHORT_SHA"

# --- attempt merge into default branch ---
git switch "$DEFAULT_BRANCH"
# pull latest default; try ff-only, fall back to rebase if needed
git pull --ff-only || git pull --rebase

set +e
git merge --ff-only "$AUTO_BRANCH"
FF=$?
set -e

if [ $FF -ne 0 ]; then
  echo "Fast-forward not possible. Trying auto-merge preferring your branch (-X theirs)."
  set +e
  git merge -X theirs --no-edit "$AUTO_BRANCH"
  MERGED=$?
  set -e
  if [ $MERGED -ne 0 ]; then
    echo "Auto-merge failed. Leaving branch pushed so Claude can fetch it."
    REPO_SLUG="$(git remote get-url origin | sed -E 's#(git@|https://)github.com[:/](.+)(\.git)?#\2#')"
    echo "Create a PR if you want to merge: https://github.com/$REPO_SLUG/compare/$DEFAULT_BRANCH...$AUTO_BRANCH"
    exit 0
  fi
fi

# --- push merged default branch ---
git push origin "$DEFAULT_BRANCH"

# --- report URLs Claude can fetch ---
REPO_SLUG="$(git remote get-url origin | sed -E 's#(git@|https://)github.com[:/](.+)(\.git)?#\2#')"
FULL_SHA="$(git rev-parse HEAD)"
echo "Merged to $DEFAULT_BRANCH."
echo "Branch URL : https://github.com/$REPO_SLUG/tree/$AUTO_BRANCH"
echo "Commit URL : https://github.com/$REPO_SLUG/commit/$FULL_SHA"
echo "Default URL: https://github.com/$REPO_SLUG/tree/$DEFAULT_BRANCH"
