/**
 * Extracts dominant colors from an image element.
 * @param {HTMLImageElement} imageElement - The source image.
 * @param {number} maxColors - Number of colors to return (default 4).
 * @returns {Promise<Array<string>>} - Array of hex color strings.
 */
export async function getDominantColors(imageElement, maxColors = 4) {
    return new Promise((resolve, reject) => {
        const fallbackColors = ['#1a1a1a', '#2a2a2a', '#3a3a3a', '#000000'];
        
        if (!imageElement || !imageElement.src || imageElement.src === '') {
            resolve(fallbackColors);
            return;
        }

        const extract = () => {
            try {
                // Create a small canvas for processing
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const width = 64; // Small size for performance
                const height = 64;

                canvas.width = width;
                canvas.height = height;

                // Draw image to canvas
                try {
                    ctx.drawImage(imageElement, 0, 0, width, height);
                } catch (e) {
                    // Handle taint issues or other draw errors
                    console.warn("Could not draw image to canvas (CORS?):", e);
                    resolve(fallbackColors);
                    return;
                }

                // Get image data
                const imageData = ctx.getImageData(0, 0, width, height).data;
                const colorCounts = {};

                // Quantize and count colors
                for (let i = 0; i < imageData.length; i += 4) {
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];
                    const a = imageData[i + 3];

                    // Skip transparent pixels
                    if (a < 128) continue;

                    // Quantize to reduce color space (e.g., round to nearest 24)
                    const qr = Math.round(r / 24) * 24;
                    const qg = Math.round(g / 24) * 24;
                    const qb = Math.round(b / 24) * 24;

                    const key = `${qr},${qg},${qb}`;
                    colorCounts[key] = (colorCounts[key] || 0) + 1;
                }

                // Sort colors by frequency
                const sortedColors = Object.entries(colorCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(entry => {
                        const [r, g, b] = entry[0].split(',').map(Number);
                        return { r, g, b, count: entry[1] };
                    });
                
                // Pick top distinct colors
                const finalColors = [];
                
                // Helper to convert rgb to hex
                const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
                    const hex = Math.min(255, Math.max(0, x)).toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                }).join('');

                // Basic distinct filtering
                for (const color of sortedColors) {
                    if (finalColors.length >= maxColors) break;
                    
                    let isDistinct = true;
                    for (const existing of finalColors) {
                        const dist = Math.abs(color.r - existing.r) + Math.abs(color.g - existing.g) + Math.abs(color.b - existing.b);
                        if (dist < 60) { // Threshold for distinctness
                            isDistinct = false;
                            break;
                        }
                    }
                    
                    if (isDistinct) {
                        finalColors.push(color);
                    }
                }
                
                // Fill if not enough colors
                while (finalColors.length < maxColors) {
                    if (sortedColors.length > finalColors.length) {
                        // Try to pick next most frequent even if not distinct, to avoid grey fallback if possible
                        // But for now, fallback to generic grey to ensure valid colors
                        finalColors.push({ r: 20, g: 20, b: 20 }); 
                    } else {
                        finalColors.push({ r: 20, g: 20, b: 20 }); 
                    }
                }

                const hexColors = finalColors.map(c => rgbToHex(c.r, c.g, c.b));
                resolve(hexColors);

            } catch (e) {
                console.error("Color extraction failed:", e);
                resolve(fallbackColors);
            }
        };

        if (imageElement.complete) {
            extract();
        } else {
            imageElement.onload = () => extract();
            imageElement.onerror = () => resolve(fallbackColors);
        }
    });
}
