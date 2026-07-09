$root = "$PSScriptRoot\.."
$out = "$root\og-image.png"
$icon = "$root\favicon\512.png"

# Write annotation text to UTF-8 files (no BOM) to ensure ImageMagick
# receives proper Unicode on Windows (passing text via CLI args can
# mangle Cyrillic due to ANSI codepage issues).
$tmpDir = $env:TEMP
$line1 = "СКОПИПАСТИ В"
$line2 = "MARKDOWN"
$url   = "md.guilliman.ru"

$l1 = "$tmpDir\og-line1.txt"
$l2 = "$tmpDir\og-line2.txt"
$lu = "$tmpDir\og-url.txt"

[System.IO.File]::WriteAllText($l1, $line1, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($l2, $line2, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($lu, $url,   [System.Text.UTF8Encoding]::new($false))

# 1. Create background
& magick -size 1200x630 xc:#0a0a0a "$out"

# 2. Resize icon to temp
$tmpIcon = "$tmpDir\og-icon.png"
& magick "$icon" -resize 192x192 "$tmpIcon"

# 3. Composite icon onto background
& magick "$out" "$tmpIcon" -gravity center -geometry +0-85 -composite "$out"

# 4-6. Annotate using @file syntax — reads UTF-8 text verbatim
& magick "$out" -font Arial-Black -fill white -pointsize 54 -gravity center -annotate +0+95 "@$l1" "$out"
& magick "$out" -font Arial-Black -fill white -pointsize 54 -gravity center -annotate +0+150 "@$l2" "$out"
& magick "$out" -font Arial -fill "#888888" -pointsize 18 -gravity southeast -annotate +40+40 "@$lu" "$out"

Remove-Item "$tmpIcon", $l1, $l2, $lu -Force -ErrorAction SilentlyContinue

& magick identify "$out"
Write-Host "Done: $( (Get-Item "$out").Length ) bytes"
