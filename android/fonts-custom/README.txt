Optional: drop your own font files here (exact names) and they replace the defaults at build time.
  arabic_body_regular.ttf   arabic_body_bold.ttf   -> Zanjabeel (Arabic body)
  latin_heading.ttf                                -> Wasted Vindey (Latin headings)
Defaults when missing: Zain (Arabic body), Playfair Display (Latin headings), Inter (Latin body).
Only commit fonts whose licence allows redistribution.

----- Signing keystore secret (KEYSTORE_BASE64) -----
Create it from the original file WITHOUT text-encoding side effects.
Windows PowerShell:   [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\release.jks")) | Set-Clipboard
Linux / macOS / Git Bash:  base64 -w 0 release.jks
Then paste the clipboard into the secret.  (Do not use Set-Content / Out-File / echo: they add a BOM and line breaks.)
