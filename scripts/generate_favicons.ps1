Add-Type -AssemblyName System.Drawing

function Create-Favicon($size, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Terracotta Brick Red Background (#962D1C)
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 150, 45, 28))
    $radius = [int]($size * 0.22)
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $radius * 2, $radius * 2, 180, 90)
    $path.AddArc($size - 1 - $radius * 2, 0, $radius * 2, $radius * 2, 270, 90)
    $path.AddArc($size - 1 - $radius * 2, $size - 1 - $radius * 2, $radius * 2, $radius * 2, 0, 90)
    $path.AddArc(0, $size - 1 - $radius * 2, $radius * 2, $radius * 2, 90, 90)
    $path.CloseFigure()
    $g.FillPath($bgBrush, $path)

    # Warm Gold Border (#E5C287)
    $goldPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 229, 194, 135), [float]($size * 0.05))
    $g.DrawPath($goldPen, $path)

    # Letter M in Ivory White (#FFFDF9)
    $fontFamily = [System.Drawing.FontFamily]::GenericSerif
    $fontSize = [float]($size * 0.54)
    $font = New-Object System.Drawing.Font($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 253, 248))
    
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $layoutRect = New-Object System.Drawing.RectangleF(0, [float]($size * 0.08), [float]$size, [float]($size * 0.82))
    $g.DrawString("M", $font, $whiteBrush, $layoutRect, $format)

    # Top Gold Crest Accent Dot
    $goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 214, 160))
    $dotR = [float]($size * 0.07)
    $g.FillEllipse($goldBrush, [float]($size/2 - $dotR), [float]($size * 0.09 - $dotR), [float]($dotR * 2), [float]($dotR * 2))

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Saved: $outputPath"
}

Create-Favicon 32 "src/public/favicon-32x32.png"
Create-Favicon 16 "src/public/favicon-16x16.png"
Create-Favicon 48 "src/public/favicon.ico"
