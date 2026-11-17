# Draws Sift's app icons (three rising bars on the brand blue) as PNGs.
# Run from the project root:  powershell -ExecutionPolicy Bypass -File scripts\make-icons.ps1
Add-Type -AssemblyName System.Drawing

$blue = [System.Drawing.Color]::FromArgb(255, 42, 120, 214)   # --accent #2a78d6
$white = [System.Drawing.Color]::White

function New-RoundRect([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# $size: output pixels. $rounded: rounded-square tile (normal icon) or full-bleed (maskable / Apple).
# $content: share of the tile the bars occupy (maskable icons keep content inside the central 80%).
function Save-Icon([int]$size, [string]$path, [bool]$rounded, [double]$content) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $bg = New-Object System.Drawing.SolidBrush $blue
  if ($rounded) {
    $tile = New-RoundRect 0 0 $size $size ($size * 0.22)
    $g.FillPath($bg, $tile)
  } else {
    $g.FillRectangle($bg, 0, 0, $size, $size)
  }

  # Three bars: heights 8/24, 13/24, 18/24 of the content box, like the header logo.
  $box = $size * $content
  $ox = ($size - $box) / 2
  $oy = ($size - $box) / 2
  $u = $box / 24
  $bars = @(@(3, 13, 8, 0.55), @(10, 8, 13, 0.8), @(17, 3, 18, 1.0))
  foreach ($b in $bars) {
    $alpha = [int](255 * $b[3])
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($alpha, $white))
    $rect = New-RoundRect ($ox + $b[0] * $u) ($oy + $b[1] * $u) (4 * $u) ($b[2] * $u) (1.5 * $u)
    $g.FillPath($brush, $rect)
    $brush.Dispose()
  }
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "wrote $path"
}

$root = Split-Path -Parent $PSScriptRoot
Save-Icon 192 (Join-Path $root 'public\icon-192.png') $true 0.62
Save-Icon 512 (Join-Path $root 'public\icon-512.png') $true 0.62
Save-Icon 512 (Join-Path $root 'public\icon-maskable-512.png') $false 0.5
Save-Icon 180 (Join-Path $root 'src\app\apple-icon.png') $false 0.58
Save-Icon 64 (Join-Path $root 'src\app\icon.png') $true 0.66
