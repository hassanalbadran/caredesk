#!/usr/bin/env bash
# Downloads the open-source fonts into app/src/main/res/font (run by CI; safe to run locally).
# Custom files placed in android/fonts-custom/ always win:
#   arabic_body_regular.ttf  arabic_body_bold.ttf   (Zanjabeel)
#   latin_heading.ttf                               (Wasted Vindey, if you prefer it over Playfair Display)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=app/src/main/res/font
mkdir -p "$OUT"
RAW=https://raw.githubusercontent.com/google/fonts/main/ofl

get() { # url dest  (a failed download is reported, not fatal: fallbacks below keep the build alive)
  [ -s "$2" ] || curl -fsSL --retry 3 -o "$2" "$1" || { echo "WARN: could not download $1" >&2; rm -f "$2"; }
}
fallback() { # dest source  (copy source over a missing dest)
  [ -s "$1" ] || { [ -s "$2" ] && cp "$2" "$1" && echo "WARN: using $2 for $1" >&2; }
}

# Arabic headings: Zain (OFL)
get "$RAW/zain/Zain-Light.ttf"     "$OUT/zain_light.ttf"
get "$RAW/zain/Zain-Regular.ttf"   "$OUT/zain_regular.ttf"
get "$RAW/zain/Zain-Bold.ttf"      "$OUT/zain_bold.ttf"
get "$RAW/zain/Zain-ExtraBold.ttf" "$OUT/zain_extrabold.ttf"

# Latin body: Inter (variable, OFL); Latin headings: Playfair Display (variable, OFL)
get "$RAW/inter/Inter%5Bopsz,wght%5D.ttf"          "$OUT/inter_var.ttf"
get "$RAW/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf" "$OUT/latin_heading.ttf"

# Missing weights fall back to the nearest one that did download.
fallback "$OUT/zain_regular.ttf"   "$OUT/zain_bold.ttf"
fallback "$OUT/zain_bold.ttf"      "$OUT/zain_regular.ttf"
fallback "$OUT/zain_light.ttf"     "$OUT/zain_regular.ttf"
fallback "$OUT/zain_extrabold.ttf" "$OUT/zain_bold.ttf"

# Arabic body: Zanjabeel if supplied, otherwise Zain so the build never breaks.
[ -f fonts-custom/arabic_body_regular.ttf ] && cp fonts-custom/arabic_body_regular.ttf "$OUT/arabic_body_regular.ttf" || cp "$OUT/zain_regular.ttf" "$OUT/arabic_body_regular.ttf"
[ -f fonts-custom/arabic_body_bold.ttf ]    && cp fonts-custom/arabic_body_bold.ttf    "$OUT/arabic_body_bold.ttf"    || cp "$OUT/zain_bold.ttf"    "$OUT/arabic_body_bold.ttf"
[ -f fonts-custom/latin_heading.ttf ]       && cp fonts-custom/latin_heading.ttf       "$OUT/latin_heading.ttf" || true
[ -f fonts-custom/inter_var.ttf ]           && cp fonts-custom/inter_var.ttf           "$OUT/inter_var.ttf" || true
# Every font the app references must exist, otherwise the Gradle build fails with a clear message here instead.
for f in zain_light zain_regular zain_bold zain_extrabold arabic_body_regular arabic_body_bold inter_var latin_heading; do
  [ -s "$OUT/$f.ttf" ] || { echo "ERROR: $OUT/$f.ttf is missing - put it in android/fonts-custom/ or fix the URL in this script" >&2; exit 1; }
done
ls -l "$OUT"
