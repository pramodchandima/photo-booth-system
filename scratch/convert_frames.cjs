const { Jimp } = require('jimp');
const fs = require('fs');

async function cleanFrame(inputPath, outputPath) {
  console.log(`Processing ${inputPath}...`);
  const image = await Jimp.read(inputPath);
  const w = image.bitmap.width;
  const h = image.bitmap.height;

  // We will run a flood-fill from the center of the image
  // The center is guaranteed to be inside the transparent placeholder grid
  const startX = Math.floor(w / 2);
  const startY = Math.floor(h / 2);

  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h * 2);
  let head = 0;
  let tail = 0;

  queue[tail++] = startX;
  queue[tail++] = startY;
  visited[startY * w + startX] = 1;

  // Function to check if a pixel belongs to the placeholder pattern
  // The placeholder pattern is composed of neutral gray/white squares (RGB close to each other)
  // and is NOT bright yellow (the frame glow) nor rich dark frame border
  function isGridPixel(idx) {
    const r = image.bitmap.data[idx];
    const g = image.bitmap.data[idx + 1];
    const b = image.bitmap.data[idx + 2];

    // High saturation/colorful pixels (like yellow/orange/gold) belong to the frame!
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    // Yellows & frame accents have significant color difference (saturation)
    if (diff > 25) return false;

    // Check brightness: the checkerboard is between dark gray (~60) and light gray/white (~240)
    // Frame borders may be pitch black (diff < 15, max < 30)
    if (max < 38) return false; 

    return true;
  }

  const toClear = [];

  while (head < tail) {
    const cx = queue[head++];
    const cy = queue[head++];
    const pixelIndex = (cy * w + cx) * 4;

    toClear.push(pixelIndex);

    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1]
    ];

    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];

      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nPos = ny * w + nx;
        if (!visited[nPos]) {
          visited[nPos] = 1;
          const nIdx = nPos * 4;
          if (isGridPixel(nIdx)) {
            queue[tail++] = nx;
            queue[tail++] = ny;
          }
        }
      }
    }
  }

  console.log(`Clearing ${toClear.length} pixels in ${inputPath}...`);
  for (let i = 0; i < toClear.length; i++) {
    const idx = toClear[i];
    image.bitmap.data[idx] = 0;
    image.bitmap.data[idx + 1] = 0;
    image.bitmap.data[idx + 2] = 0;
    image.bitmap.data[idx + 3] = 0; // Alpha = 0 (Transparent!)
  }

  await image.write(outputPath);
  console.log(`Saved transparent frame to ${outputPath}`);
}

async function run() {
  await cleanFrame('public/imag1.jpg', 'public/frames/frame1.png');
  await cleanFrame('public/imag2.jpg', 'public/frames/frame2.png');
  await cleanFrame('public/imag3.jpg', 'public/frames/frame3.png');
}

run().catch(console.error);
