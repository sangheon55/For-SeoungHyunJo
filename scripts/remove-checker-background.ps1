param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies 'System.Drawing' -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class CheckerBackgroundRemover
{
    public static void Run(string inputPath, string outputPath)
    {
        using (var source = new Bitmap(inputPath))
        using (var image = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(image))
                graphics.DrawImageUnscaled(source, 0, 0);

            var rect = new Rectangle(0, 0, image.Width, image.Height);
            var data = image.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            var bytes = Math.Abs(data.Stride) * image.Height;
            var pixels = new byte[bytes];
            Marshal.Copy(data.Scan0, pixels, 0, bytes);

            var visited = new bool[image.Width * image.Height];
            var queue = new Queue<int>();

            Action<int, int> enqueue = (x, y) =>
            {
                var index = y * image.Width + x;
                if (visited[index]) return;
                var offset = y * data.Stride + x * 4;
                var b = pixels[offset];
                var g = pixels[offset + 1];
                var r = pixels[offset + 2];
                var nearlyGray = Math.Abs(r - g) <= 5 && Math.Abs(g - b) <= 5;
                var bright = r >= 215 && g >= 215 && b >= 215;
                if (!nearlyGray || !bright) return;
                visited[index] = true;
                queue.Enqueue(index);
            };

            for (var x = 0; x < image.Width; x++)
            {
                enqueue(x, 0);
                enqueue(x, image.Height - 1);
            }
            for (var y = 0; y < image.Height; y++)
            {
                enqueue(0, y);
                enqueue(image.Width - 1, y);
            }

            var dx = new[] { -1, 0, 1, -1, 1, -1, 0, 1 };
            var dy = new[] { -1, -1, -1, 0, 0, 1, 1, 1 };
            while (queue.Count > 0)
            {
                var index = queue.Dequeue();
                var x = index % image.Width;
                var y = index / image.Width;
                var offset = y * data.Stride + x * 4;
                pixels[offset + 3] = 0;

                for (var i = 0; i < 8; i++)
                {
                    var nx = x + dx[i];
                    var ny = y + dy[i];
                    if (nx >= 0 && nx < image.Width && ny >= 0 && ny < image.Height)
                        enqueue(nx, ny);
                }
            }

            Marshal.Copy(pixels, 0, data.Scan0, bytes);
            image.UnlockBits(data);
            image.Save(outputPath, ImageFormat.Png);
        }
    }
}
'@

$inputFull = [System.IO.Path]::GetFullPath($InputPath)
$outputFull = [System.IO.Path]::GetFullPath($OutputPath)
[CheckerBackgroundRemover]::Run($inputFull, $outputFull)
