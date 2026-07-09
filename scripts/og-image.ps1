$root = "$PSScriptRoot\.."
$out = "$root\og-image.png"
$icon = "$root\favicon\512.png"

# 1. Create background (sRGB canvas)
& magick -size 1200x630 xc:#0a0a0a -colorspace sRGB -strip -depth 8 "$out"

# 2. Resize icon to temp
$tmpIcon = "$env:TEMP\og-icon.png"
& magick "$icon" -resize 192x192 -colorspace sRGB -strip -depth 8 "$tmpIcon"

# 3. Composite icon onto background
& magick "$out" "$tmpIcon" -gravity center -geometry +0-85 -composite "$out"

# 4. Title line 1
& magick "$out" -font Arial-Black -fill white -pointsize 54 -gravity center -annotate +0+95 "СКОПИПАСТИ В" "$out"

# 5. Title line 2
& magick "$out" -font Arial-Black -fill white -pointsize 54 -gravity center -annotate +0+150 "MARKDOWN" "$out"

# 6. URL
& magick "$out" -font Arial -fill "#888888" -pointsize 18 -gravity southeast -annotate +40+40 "md.guilliman.ru" "$out"

Remove-Item "$tmpIcon" -Force -ErrorAction SilentlyContinue

& magick identify "$out"
Write-Host "Done: $( (Get-Item "$out").Length ) bytes"
