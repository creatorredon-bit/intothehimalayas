import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { mapConfig } from '@/lib/env';
import { formatDistance, formatDuration, formatElevation } from '@/lib/format';
import type { LngLat } from '@/lib/types';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  slug?: string;
  meta?: string;
}

interface MapViewProps {
  markers?: MapMarker[];
  route?: LngLat[] | null;
  className?: string;
  heightClass?: string;
  interactive?: boolean;
  zoom?: number;
  center?: [number, number];
  ariaLabel?: string;
}

const markerIcon = L.divIcon({
  className: 'ith-marker',
  html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#2E7D5B;border:3px solid #F8FCF8;box-shadow:0 2px 8px rgba(31,41,51,0.45)"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

const startIcon = L.divIcon({
  className: 'ith-marker-start',
  html: '<span style="display:block;width:20px;height:20px;border-radius:9999px;background:#F7C873;border:3px solid #2E7D5B;box-shadow:0 2px 10px rgba(31,41,51,0.5)"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((point) => point.join(',')).join('|');

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 11, { animate: false });
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 13, animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures point changes
  }, [key, map]);

  return null;
}

export function MapView({
  markers = [],
  route = null,
  className,
  heightClass = 'h-[26rem]',
  interactive = true,
  zoom = 9,
  center = [28.3949, 84.124],
  ariaLabel = 'Interactive trail map',
}: MapViewProps) {
  const points = useMemo<[number, number][]>(() => {
    const all: [number, number][] = markers.map((marker) => [marker.lat, marker.lng]);
    if (route) for (const [lng, lat] of route) all.push([lat, lng]);
    return all;
  }, [markers, route]);

  const routePositions = useMemo<[number, number][]>(
    () => (route ? route.map(([lng, lat]) => [lat, lng] as [number, number]) : []),
    [route],
  );

  const initialCenter: [number, number] = points[0] ?? center;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-stone-line bg-stone-paper ${heightClass} ${className ?? ''}`}
      aria-label={ariaLabel}
      role="region"
    >
      <MapContainer
        center={initialCenter}
        zoom={zoom}
        scrollWheelZoom={false}
        dragging={interactive}
        zoomControl={interactive}
        doubleClickZoom={interactive}
        attributionControl
        className="h-full w-full"
      >
        <TileLayer
          url={mapConfig.tileUrl}
          attribution={mapConfig.attribution}
          maxZoom={mapConfig.maxZoom}
          subdomains={['a', 'b', 'c']}
        />
        <FitBounds points={points} />
        {routePositions.length > 1 && (
          <Polyline positions={routePositions} pathOptions={{ color: '#2E7D5B', weight: 4, opacity: 0.9 }} />
        )}
        {markers.map((marker, index) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={index === 0 ? startIcon : markerIcon}
          >
            <Popup>
              <div className="min-w-40">
                {marker.slug ? (
                  <Link to={`/trails/${marker.slug}`} className="font-semibold text-forest-700 underline">
                    {marker.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-ink">{marker.label}</span>
                )}
                {marker.meta && <p className="mt-1 text-xs text-ink-muted">{marker.meta}</p>}
                {marker.slug && (
                  <p className="mt-1 text-xs text-ink-faint">Open the trail page for the full route guide.</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="pointer-events-none absolute bottom-2 left-1/2 z-[400] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[0.65rem] font-medium text-ink-muted shadow-sm">
        Route lines are illustrative · verify on the ground
      </p>
    </div>
  );
}

export function trailMarkerMeta(trail: {
  distanceKm: number;
  durationDays: number;
  maxElevationM: number;
}): string {
  return `${formatDistance(trail.distanceKm)} · ${formatDuration(trail.durationDays)} · ${formatElevation(trail.maxElevationM)}`;
}
