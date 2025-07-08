// Load cooling load profile from CSV file
export async function loadCoolingLoadProfile(): Promise<Array<{hour: number, load: number}>> {
  try {
    const response = await fetch('/src/data/cooling-load-profile.csv');
    const csvText = await response.text();
    
    // Parse CSV
    const lines = csvText.split('\n').filter(line => line.trim());
    const profile: Array<{hour: number, load: number}> = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',');
      
      if (parts.length >= 2) {
        // Extract hour from datetime string (e.g., "2025-06-17 00:00:00" -> 0)
        const datetime = parts[0].replace(/"/g, '');
        const hour = parseInt(datetime.split(' ')[1].split(':')[0]);
        
        // Extract load value
        const load = parseFloat(parts[1].replace(/"/g, ''));
        
        if (!isNaN(hour) && !isNaN(load)) {
          profile.push({ hour, load });
        }
      }
    }
    
    return profile;
  } catch (error) {
    console.error('Error loading cooling load profile:', error);
    // Fallback to default profile if CSV loading fails
    return defaultCoolingLoadProfile;
  }
}

// Default cooling load profile (fallback)
const defaultCoolingLoadProfile: Array<{hour: number, load: number}> = [
  { hour: 0, load: 1000 },
  { hour: 1, load: 800 },
  { hour: 2, load: 700 },
  { hour: 3, load: 600 },
  { hour: 4, load: 500 },
  { hour: 5, load: 400 },
  { hour: 6, load: 500 },
  { hour: 7, load: 800 },
  { hour: 8, load: 1200 },
  { hour: 9, load: 1500 },
  { hour: 10, load: 1800 },
  { hour: 11, load: 2000 },
  { hour: 12, load: 2200 },
  { hour: 13, load: 2300 },
  { hour: 14, load: 2400 },
  { hour: 15, load: 2300 },
  { hour: 16, load: 2200 },
  { hour: 17, load: 2000 },
  { hour: 18, load: 1800 },
  { hour: 19, load: 1600 },
  { hour: 20, load: 1400 },
  { hour: 21, load: 1200 },
  { hour: 22, load: 1000 },
  { hour: 23, load: 900 }
];

// Export the default profile for backward compatibility
export const coolingLoadProfile = defaultCoolingLoadProfile; 