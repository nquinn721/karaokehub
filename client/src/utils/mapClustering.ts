// Map clustering utility for grouping nearby shows based on zoom level
import { Show } from '../stores/ShowStore';

export interface ClusterMarker {
  id: string;
  lat: number;
  lng: number;
  showCount: number;
  shows: Show[];
  isCluster: boolean;
}

export interface SingleMarker {
  id: string;
  lat: number;
  lng: number;
  show: Show;
  isCluster: false;
}

export type MapMarker = ClusterMarker | SingleMarker;

// Calculate distance between two points in kilometers
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get clustering distance based on zoom level
function getClusteringDistance(zoom: number): number {
  // Zoom levels and corresponding clustering distances:
  // 1-4: Country level (500+ km clustering)
  // 5-6: State level (200-500 km clustering)
  // 7-8: Large metro (100-200 km clustering)
  // 9-10: Metro area (50-100 km clustering)
  // 11-12: City level (20-50 km clustering)
  // 13-14: Local area (5-20 km clustering)
  // 15+: Neighborhood (no clustering)

  if (zoom <= 4) {
    return 500; // 500km for country level
  } else if (zoom <= 6) {
    return 200; // 200km for state level
  } else if (zoom <= 8) {
    return 100; // 100km for large metro
  } else if (zoom <= 10) {
    return 50; // 50km for metro area
  } else if (zoom <= 12) {
    return 20; // 20km for city level
  } else if (zoom <= 14) {
    return 5; // 5km for local area
  } else {
    return 0; // No clustering at neighborhood level
  }
}

// Cluster shows based on proximity and zoom level
export function clusterShows(shows: Show[], zoom: number): MapMarker[] {
  const clusteringDistance = getClusteringDistance(zoom);

  // If no clustering needed at this zoom level, return individual markers
  if (clusteringDistance === 0) {
    return shows
      .filter((show) => show.lat && show.lng)
      .map((show) => ({
        id: show.id,
        lat: typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat!,
        lng: typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng!,
        show,
        isCluster: false as const,
      }));
  }

  const clusters: ClusterMarker[] = [];
  const processedShows = new Set<string>();

  shows.forEach((show) => {
    if (processedShows.has(show.id) || !show.lat || !show.lng) return;

    const showLat = typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat;
    const showLng = typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng;

    if (isNaN(showLat) || isNaN(showLng)) return;

    // Find nearby shows to cluster with
    const nearbyShows = shows.filter((otherShow) => {
      if (processedShows.has(otherShow.id) || otherShow.id === show.id) return false;
      if (!otherShow.lat || !otherShow.lng) return false;

      const otherLat =
        typeof otherShow.lat === 'string' ? parseFloat(otherShow.lat) : otherShow.lat;
      const otherLng =
        typeof otherShow.lng === 'string' ? parseFloat(otherShow.lng) : otherShow.lng;

      if (isNaN(otherLat) || isNaN(otherLng)) return false;

      const distance = calculateDistance(showLat, showLng, otherLat, otherLng);
      return distance <= clusteringDistance;
    });

    // Mark all shows in this cluster as processed
    processedShows.add(show.id);
    nearbyShows.forEach((nearbyShow) => processedShows.add(nearbyShow.id));

    // Create cluster
    const clusterShows = [show, ...nearbyShows];

    if (clusterShows.length === 1) {
      // Single show, create individual marker
      clusters.push({
        id: show.id,
        lat: showLat,
        lng: showLng,
        showCount: 1,
        shows: [show],
        isCluster: false,
      } as any); // Type assertion to handle the individual marker case
    } else {
      // Multiple shows, create cluster marker
      // Calculate cluster center (centroid)
      const centerLat =
        clusterShows.reduce((sum, s) => {
          const lat = typeof s.lat === 'string' ? parseFloat(s.lat) : s.lat!;
          return sum + lat;
        }, 0) / clusterShows.length;

      const centerLng =
        clusterShows.reduce((sum, s) => {
          const lng = typeof s.lng === 'string' ? parseFloat(s.lng) : s.lng!;
          return sum + lng;
        }, 0) / clusterShows.length;

      clusters.push({
        id: `cluster-${show.id}`,
        lat: centerLat,
        lng: centerLng,
        showCount: clusterShows.length,
        shows: clusterShows,
        isCluster: true,
      });
    }
  });

  return clusters;
}

// Create cluster marker icon with count
export function createClusterIcon(count: number, isSelected = false): string {
  const size = Math.min(50, Math.max(30, 20 + count * 2)); // Scale icon size based on count
  const backgroundColor = isSelected ? '#d32f2f' : '#f44336';
  const textColor = '#ffffff';
  const fontSize = Math.min(16, Math.max(10, 8 + count * 0.5));

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${backgroundColor}" stroke="#fff" stroke-width="2"/>
      <text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central" 
            fill="${textColor}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold">
        ${count > 99 ? '99+' : count}
      </text>
    </svg>
  `)}`;
}

// Create individual show marker icon
export function createShowIcon(isSelected = false): string {
  const iconColor = isSelected ? '#d32f2f' : '#f44336';

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="${iconColor}" stroke="#fff" stroke-width="2"/>
      <path d="M16 20c2.21 0 3.98-1.79 3.98-4L20 10c0-2.21-1.79-4-4-4s-4 1.79-4 4v6c0 2.21 1.79 4 4 4zm6.6-4c0 4-3.4 6.8-6.6 6.8s-6.6-2.8-6.6-6.8H8c0 4.55 3.62 8.31 8 8.96V28h2v-3.04c4.38-.65 8-4.41 8-8.96h-1.4z" fill="#fff"/>
    </svg>
  `)}`;
}

// Get cluster bounds for fitting map view
export function getClusterBounds(markers: MapMarker[]): google.maps.LatLngBounds | null {
  if (markers.length === 0) return null;

  const bounds = new google.maps.LatLngBounds();
  markers.forEach((marker) => {
    bounds.extend({ lat: marker.lat, lng: marker.lng });
  });

  return bounds;
}

// Expand cluster to show individual shows
export function expandCluster(cluster: ClusterMarker, zoom: number): MapMarker[] {
  // If already at max zoom, return individual markers
  if (zoom >= 15) {
    return cluster.shows.map((show) => ({
      id: show.id,
      lat: typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat!,
      lng: typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng!,
      show,
      isCluster: false as const,
    }));
  }

  // Otherwise, re-cluster at higher zoom level
  return clusterShows(cluster.shows, zoom + 2);
}
