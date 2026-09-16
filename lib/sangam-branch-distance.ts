/**
 * Sangam Branch Distance & Geolocation Helper
 * Uses the Haversine formula to compute distance (in kilometers) between GPS coordinates.
 */

export interface BranchLocation {
  id: string
  name: string
  shortName: string
  lat: number
  lon: number
  [key: string]: any
}

/**
 * Calculates straight-line distance in kilometers between two GPS coordinates
 */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Sorts an array of branches by proximity to the specified user location (lat, lon)
 */
export function sortBranchesByNearest<T extends { lat: number; lon: number }>(
  userLat: number,
  userLon: number,
  branches: T[]
): (T & { distanceKm: number })[] {
  return branches
    .map((b) => ({
      ...b,
      distanceKm: parseFloat(haversineKm(userLat, userLon, b.lat, b.lon).toFixed(1)),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
}
