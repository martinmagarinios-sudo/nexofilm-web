Add-Type -AssemblyName System.Drawing
$width = 1200
$height = 630
$bmp = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.Clear([System.Drawing.Color]::Black)

$logoPath = "d:\Documentos\NexoFIlm\Pagina creada por Google Studio\nexofilm---productora-audiovisual V3\public\Logos blanco PNG-03.png"
$logo = [System.Drawing.Image]::FromFile($logoPath)

$scale = [math]::Min(900.0 / $logo.Width, 400.0 / $logo.Height)
$newWidth = [int]($logo.Width * $scale)
$newHeight = [int]($logo.Height * $scale)
$x = [int](($width - $newWidth) / 2)
$y = [int](($height - $newHeight) / 2)

$graphics.DrawImage($logo, $x, $y, $newWidth, $newHeight)

$outPath = "d:\Documentos\NexoFIlm\Pagina creada por Google Studio\nexofilm---productora-audiovisual V3\public\logo-whatsapp.jpg"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)

$graphics.Dispose()
$logo.Dispose()
$bmp.Dispose()
