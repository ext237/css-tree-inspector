param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $ProjectRoot "icons"

foreach ($size in 16, 32, 48, 128) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $scale = $size / 128
    $blue = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 115, 232))
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $graphics.FillEllipse($blue, 4 * $scale, 4 * $scale, 120 * $scale, 120 * $scale)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [Math]::Max(1.5, 9 * $scale))
    $pen.StartCap = $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLine($pen, 34 * $scale, 29 * $scale, 34 * $scale, 99 * $scale)
    foreach ($node in @(@(66,43,34), @(84,64,34), @(66,85,34))) {
        $graphics.DrawLine($pen, $node[2] * $scale, $node[1] * $scale, $node[0] * $scale, $node[1] * $scale)
        $radius = [Math]::Max(2, 8 * $scale)
        $graphics.FillEllipse($white, $node[0] * $scale - $radius, $node[1] * $scale - $radius, 2 * $radius, 2 * $radius)
    }
    $path = Join-Path $iconDirectory "icon$size.png"
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $pen.Dispose(); $white.Dispose(); $blue.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
