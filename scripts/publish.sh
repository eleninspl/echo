#!/usr/bin/env bash
# Push main to the public repo, with its history minus the files that must never
# go public. This repo stays private: GitHub keeps every PR's commits, and some of
# them hold a file of Qloo results. Needs git-filter-repo (brew install git-filter-repo).
set -euo pipefail

public="${ECHO_PUBLIC_REPO:-https://github.com/eleninspl/echo.git}"
private="$(git -C "$(dirname "$0")/.." remote get-url origin)"

# Deleted from main, still in the history: Qloo results (engine/reach.json) and
# the brag video, taken down on 29 Oct.
removed=(engine/reach.json brag-output/)

if [ "$public" = "$private" ]; then
  echo "ECHO_PUBLIC_REPO is this private repo" >&2
  exit 1
fi
command -v git-filter-repo >/dev/null || { echo "Install git-filter-repo first" >&2; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

git clone --quiet --single-branch --branch main "$private" "$work/repo"
cd "$work/repo"
tree="$(git rev-parse 'HEAD^{tree}')"

args=()
for path in "${removed[@]}"; do args+=(--path "$path"); done

# Commit emails become GitHub noreply addresses, so no personal address goes public.
git filter-repo --quiet --force --invert-paths "${args[@]}" --commit-callback '
for who in ("author", "committer"):
    name = getattr(commit, who + "_name")
    if name in (b"eleninspl", b"Eleni Nasopoulou"):
        setattr(commit, who + "_name", b"Eleni Nasopoulou")
        setattr(commit, who + "_email", b"106030608+eleninspl@users.noreply.github.com")
    elif name == b"Leonidas Anagnou":
        setattr(commit, who + "_email", b"117045666+anagnole@users.noreply.github.com")
' >/dev/null

# main itself must come through unchanged: if it differs, main holds a removed file.
if [ "$(git rev-parse 'HEAD^{tree}')" != "$tree" ]; then
  echo "main holds a file on the removed list: delete it from main first" >&2
  exit 1
fi

# The rewrite gives the same commits each time, so this is a plain fast-forward.
git push --quiet "$public" main
echo "Pushed $(git rev-list --count HEAD) commits, main at $(git rev-parse --short HEAD), to $public"
