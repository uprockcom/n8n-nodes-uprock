#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/release-version.sh [patch|minor|major] [--dry-run] [--prerelease]

Creates the next semantic GitHub release from origin/main.

Defaults to a patch release when no bump type is provided.

Options:
  patch         Bump the patch version (default)
  minor         Bump the minor version
  major         Bump the major version
  --dry-run     Show the next version and planned commands without changing files
  --prerelease  Mark the GitHub release as a prerelease
  -h, --help    Show this help
EOF
}

log() {
  printf '%s\n' "$*"
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi

  "$@"
}

update_changelog() {
  local version="$1"
  local release_date="$2"
  local entries="$3"

  CHANGELOG_VERSION="$version" \
  CHANGELOG_DATE="$release_date" \
  CHANGELOG_ENTRIES="$entries" \
  node <<'NODE'
const fs = require('fs');

const path = 'CHANGELOG.md';
const version = process.env.CHANGELOG_VERSION;
const releaseDate = process.env.CHANGELOG_DATE;
const entries = (process.env.CHANGELOG_ENTRIES || '- No release notes captured.').trim();

const header = '# Changelog';
const section = `## ${version} - ${releaseDate}\n\n${entries}\n`;

let current = '';

if (fs.existsSync(path)) {
  current = fs.readFileSync(path, 'utf8').trim();
}

if (!current) {
  fs.writeFileSync(path, `${header}\n\n${section}\n`);
  process.exit(0);
}

if (!current.startsWith(header)) {
  fs.writeFileSync(path, `${header}\n\n${section}\n\n${current}\n`);
  process.exit(0);
}

const rest = current.slice(header.length).trimStart();
const next = rest ? `${header}\n\n${section}\n${rest}\n` : `${header}\n\n${section}\n`;
fs.writeFileSync(path, next.replace(/\n{3,}/g, '\n\n'));
NODE
}

create_github_release() {
  local tag="$1"
  local prerelease="$2"

  local args=(release create "$tag" --title "$tag" --generate-notes)

  if [[ "$prerelease" == "true" ]]; then
    args+=(--prerelease)
  fi

  run gh "${args[@]}"
}

DRY_RUN="false"
PRERELEASE="false"
REMOTE_NAME="origin"
BRANCH_NAME="main"
BUMP_TYPE="patch"

while (($# > 0)); do
  case "$1" in
    patch|minor|major)
      [[ "$BUMP_TYPE" == "patch" ]] || fail "Bump type already set to ${BUMP_TYPE}"
      BUMP_TYPE="$1"
      shift
      ;;
    --patch)
      BUMP_TYPE="patch"
      shift
      ;;
    --minor)
      BUMP_TYPE="minor"
      shift
      ;;
    --major)
      BUMP_TYPE="major"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --prerelease)
      PRERELEASE="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      fail "Unknown argument: $1"
      ;;
  esac
done

command -v git >/dev/null 2>&1 || fail 'git is required'
command -v gh >/dev/null 2>&1 || fail 'gh is required'
command -v node >/dev/null 2>&1 || fail 'node is required'
command -v npm >/dev/null 2>&1 || fail 'npm is required'

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || fail 'Run this script inside the git repository'
cd "$repo_root"

current_branch="$(git branch --show-current)"
[[ "$current_branch" == "$BRANCH_NAME" ]] || fail "Release must run from ${BRANCH_NAME}, found ${current_branch}"

if [[ "$DRY_RUN" != "true" ]]; then
  git diff --quiet || fail 'Working tree has unstaged changes'
  git diff --cached --quiet || fail 'Working tree has staged changes'
  gh auth status >/dev/null 2>&1 || fail 'gh is not authenticated'
fi

log "Fetching ${REMOTE_NAME}/${BRANCH_NAME} and tags"
git fetch "$REMOTE_NAME" "$BRANCH_NAME" --tags --force

local_head="$(git rev-parse HEAD)"
remote_head="$(git rev-parse "${REMOTE_NAME}/${BRANCH_NAME}")"
[[ "$local_head" == "$remote_head" ]] || fail "Local ${BRANCH_NAME} must match ${REMOTE_NAME}/${BRANCH_NAME} before releasing"

latest_tag="$(
  git tag --sort=-v:refname |
    grep -E '^(v)?[0-9]+\.[0-9]+\.[0-9]+$' |
    head -n 1 || true
)"
package_version="$(node -p "require('./package.json').version")"

if [[ -n "$latest_tag" ]]; then
  latest_version="${latest_tag#v}"
  latest_tag_commit="$(git rev-list -n 1 "$latest_tag")"

  if [[ "$package_version" == "$latest_version" && "$latest_tag_commit" == "$local_head" ]]; then
    if gh release view "$latest_tag" >/dev/null 2>&1; then
      fail "Latest tag ${latest_tag} already points at HEAD and already has a GitHub release"
    fi

    log "Creating the missing GitHub release for ${latest_tag}"
    create_github_release "$latest_tag" "$PRERELEASE"
    exit 0
  fi

  [[ "$package_version" == "$latest_version" ]] || fail "package.json version ${package_version} must match latest tag ${latest_tag} before auto-releasing"

  commits_since_tag="$(git rev-list --count "${latest_tag}..HEAD")"
  [[ "$commits_since_tag" -gt 0 ]] || fail "No commits found since ${latest_tag}"

  base_version="$latest_version"
  commit_range="${latest_tag}..HEAD"
else
  base_version="$package_version"
  commit_range="HEAD"
fi

next_version="$(node -e '
const version = process.argv[1];
const bumpType = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Invalid semver version: ${version}`);
}
const [major, minor, patch] = version.split(".").map(Number);
if (bumpType === "major") {
  console.log(`${major + 1}.0.0`);
} else if (bumpType === "minor") {
  console.log(`${major}.${minor + 1}.0`);
} else if (bumpType === "patch") {
  console.log(`${major}.${minor}.${patch + 1}`);
} else {
  throw new Error(`Unsupported bump type: ${bumpType}`);
}
' "$base_version" "$BUMP_TYPE")"
next_tag="v${next_version}"
release_date="$(date -u +%Y-%m-%d)"
changelog_entries="$(git log --reverse --pretty=format:'- %s' ${commit_range})"

if [[ -z "$changelog_entries" ]]; then
  changelog_entries='- No release notes captured.'
fi

log "Bump type: ${BUMP_TYPE}"
log "Latest tag: ${latest_tag:-<none>}"
log "Current package version: ${package_version}"
log "Next version: ${next_version}"
log "Next tag: ${next_tag}"

if [[ "$DRY_RUN" == "true" ]]; then
  log 'Planned changelog entry:'
  printf '## %s - %s\n\n%s\n' "$next_version" "$release_date" "$changelog_entries"
  run npm version "$next_version" --no-git-tag-version
  log '[dry-run] update CHANGELOG.md'
  run git add package.json package-lock.json CHANGELOG.md
  run git commit -m "chore(release): ${next_tag}"
  run git tag -a "$next_tag" -m "Release ${next_tag}"
  run git push "$REMOTE_NAME" "$BRANCH_NAME"
  run git push "$REMOTE_NAME" "$next_tag"
  create_github_release "$next_tag" "$PRERELEASE"
  exit 0
fi

npm version "$next_version" --no-git-tag-version
update_changelog "$next_version" "$release_date" "$changelog_entries"

git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): ${next_tag}"
git tag -a "$next_tag" -m "Release ${next_tag}"
git push "$REMOTE_NAME" "$BRANCH_NAME"
git push "$REMOTE_NAME" "$next_tag"
create_github_release "$next_tag" "$PRERELEASE"
