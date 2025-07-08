// Function to mix two RGB colors and return a new RGB color
export function getComputedStyle(color1: string, color2: string): string {
  // Extract RGB values using regex
  const rgb1 = color1.match(/\d+/g)?.map(Number) || [0, 0, 0];
  const rgb2 = color2.match(/\d+/g)?.map(Number) || [0, 0, 0];

  // Mix the colors (simple average)
  const mixedRGB = rgb1.map((value, index) => 
    Math.round((value + (rgb2[index] || 0)) / 2)
  );

  return `rgb(${mixedRGB.join(', ')})`;
}