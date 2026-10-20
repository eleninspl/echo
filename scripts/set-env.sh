#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
env_file="$root/.env"
example_file="$root/.env.example"
gitignore_file="$root/.gitignore"

usage() {
  echo "Usage: $(basename "$0") KEY [VALUE]" >&2
  echo "  Omit VALUE to type it hidden, or pipe it in: pbpaste | $(basename "$0") KEY" >&2
  exit 1
}

append_line() {
  local file="$1" line="$2"
  if [ -s "$file" ] && [ -n "$(tail -c1 "$file")" ]; then
    printf '\n' >> "$file"
  fi
  printf '%s\n' "$line" >> "$file"
}

has_key() {
  grep -q "^$2=" "$1" 2>/dev/null
}

format_value() {
  local value="$1"
  if [[ "$value" == *$'\n'* ]]; then
    echo "Value must be a single line." >&2
    exit 1
  fi
  if [[ "$value" =~ ^[A-Za-z0-9_./:@+=-]*$ ]]; then
    printf '%s' "$value"
  elif [[ "$value" == *"'"* ]]; then
    echo "Value has both special characters and a single quote; edit .env by hand." >&2
    exit 1
  else
    printf "'%s'" "$value"
  fi
}

upsert() {
  local file="$1" key="$2" value="$3" tmp
  tmp="$(mktemp "$file.XXXXXX")"
  KEY="$key" VALUE="$value" awk '
    BEGIN { key = ENVIRON["KEY"]; line = key "=" ENVIRON["VALUE"]; done = 0 }
    index($0, key "=") == 1 { if (!done) { print line; done = 1 } next }
    { print }
    END { if (!done) print line }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

[ $# -ge 1 ] && [ $# -le 2 ] || usage
key="$1"
if ! [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Invalid key: $key" >&2
  exit 1
fi

if [ $# -eq 2 ]; then
  value="$2"
elif [ -t 0 ]; then
  read -r -s -p "$key: " value
  echo
else
  IFS= read -r value || true
fi

if [ -z "$value" ]; then
  echo "Empty value, nothing written." >&2
  exit 1
fi
formatted="$(format_value "$value")"

touch "$gitignore_file"
grep -qxF ".env" "$gitignore_file" || append_line "$gitignore_file" ".env"

touch "$example_file"
has_key "$example_file" "$key" || append_line "$example_file" "$key="

if [ ! -f "$env_file" ]; then
  cp "$example_file" "$env_file"
fi
chmod 600 "$env_file"

upsert "$env_file" "$key" "$formatted"
echo "Set $key in .env (value hidden, ${#value} chars)."
