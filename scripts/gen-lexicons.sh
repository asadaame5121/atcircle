#!/bin/sh
# Lexicon (lexicons/*.json) から生成物を作り直す。
#   - src/lexicons/   : TypeScript クライアント (lex-cli gen-api)
#   - docs/lexicons.md: 独自 Lexicon のリファレンス (lex-cli gen-md)
# src/lexicons は通常の Biome 対象外なので、一時設定で整形だけ行う。
set -eu
cd "$(dirname "$0")/.."

LEX_CLI="node_modules/@atproto/lex-cli/dist/index.js"
LEXICONS="$(find lexicons -name '*.json' | sort)"

rm -rf src/lexicons
# gen-api は上書き確認を求めるので yes を流す
yes | node "$LEX_CLI" gen-api src/lexicons $LEXICONS >/dev/null
# リファレンスには独自 Lexicon (net.asadaame5121.*) だけを載せる
yes | node "$LEX_CLI" gen-md docs/lexicons.md lexicons/net.asadaame5121.*.json >/dev/null

TMP_CONFIG="$(mktemp -d)"
trap 'rm -rf "$TMP_CONFIG"' EXIT
node -e '
const fs = require("fs");
const c = JSON.parse(fs.readFileSync("biome.json", "utf8"));
c.files.includes = ["**", "!!**/dist"];
c.vcs.enabled = false;
fs.writeFileSync(process.argv[1] + "/biome.json", JSON.stringify(c));
' "$TMP_CONFIG"
pnpm exec biome check --write --unsafe --config-path "$TMP_CONFIG" src/lexicons >/dev/null 2>&1 || true
echo "Lexicon の生成物を更新しました"
