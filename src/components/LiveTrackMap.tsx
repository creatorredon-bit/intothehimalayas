import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { Circle, CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { mapConfig } from '@/lib/env';
import type { TrackPoint } from '@/lib/track';
import type { SharedPosition } from '@/live/sharing';

interface LiveTrackMapProps {
  points: TrackPoint[];
  current: TrackPoint | null;
  shared?: SharedPosition[];
  follow?: boolean;
  heightClass?: string;
}

function FocusOnFix({ lat, lng, follow }: { lat: number; lng: number; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!follow) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true, duration: 0.4 });
  }, [lat, lng, follow, map]);
  return null;
}

function FitShared({ shared }: { shared: SharedPosition[] }) {
  const map = useMap();
  const key = shared.map((item) => `${item.lat.toFixed(5)},${item.lng.toFixed(5)}`).join('|');

  useEffect(() => {
    if (shared.length === 0) return;
    if (shared.length === 1) {
      map.setView([shared[0].lat, shared[0].lng], 14, { animate: false });
      return;
    }
    map.fitBounds(
      L.latLngBounds(shared.map((item) => [item.lat, item.lng] as [number, number])),
      { padding: [40, 40], maxZoom: 15, animate: false },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures coordinate changes
  }, [key, map]);

  return null;
}

/**
 * Map for live tracking. Unlike the trail map this does not re-fit on every fix:
 * the view follows the traveller so the route does not jump under them.
 */
export function LiveTrackMap({
  points,
  current,
  shared = [],
  follow = true,
  heightClass = 'h-[24rem]',
}: LiveTrackMapProps) {
  const positions = useMemo<[number, number][]>(() => points.map((point) => [point.lat, point.lng]), [points]);
  const initialCenter: [number, number] = current
    ? [current.lat, current.lng]
    : points.length > 0
      ? [points[points.length - 1].lat, points[points.length - 1].lng]
      : shared.length > 0
        ? [shared[0].lat, shared[0].lng]
        : [28.3949, 84.124];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-stone-line bg-stone-paper ${heightClass}`}
      role="region"
      aria-label="Live GPS map showing your recorded track and shared companions"
    >
      <MapContainer
        center={initialCenter}
        zoom={current ? 15 : shared.length ? 14 : 9}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          url={mapConfig.tileUrl}
          attribution={mapConfig.attribution}
          maxZoom={mapConfig.maxZoom}
          subdomains={['a', 'b', 'c']}
        />

        {positions.length > 1 && (
          <Polyline positions={positions} pathOptions={{ color: '#2E7D5B', weight: 5, opacity: 0.9 }} />
        )}

        {current && (
          <>
            {current.accuracyM !== null && current.accuracyM > 0 && current.accuracyM < 500 && (
              <Circle
                center={[current.lat, current.lng]}
                radius={current.accuracyM}
                pathOptions={{ color: '#7EC8E3', weight: 1, fillColor: '#7EC8E3', fillOpacity: 0.15 }}
              />
            )}
            <CircleMarker
              center={[current.lat, current.lng]}
              radius={8}
              pathOptions={{ color: '#F8FCF8', weight: 3, fillColor: '#2E7D5B', fillOpacity: 1 }}
            >
              <Tooltip direction="top">You are here</Tooltip>
            </CircleMarker>
            <FocusOnFix lat={current.lat} lng={current.lng} follow={follow} />
          </>
        )}

        {shared.map((position) => (
          <CircleMarker
            key={position.userId}
            center={[position.lat, position.lng]}
            radius={7}
            pathOptions={{ color: '#F8FCF8', weight: 3, fillColor: '#2B7FA1', fillOpacity: 1 }}
          >
            <Tooltip direction="top">{position.name}</Tooltip>
          </CircleMarker>
        ))}

        {shared.length > 0 && <FitShared shared={shared} />}
      </MapContainer>

      {points.length === 0 && shared.length === 0 && (
        <p className="pointer-events-none absolute inset-x-4 top-4 z-[400] rounded-full bg-white/95 px-3 py-1.5 text-center text-xs font-medium text-ink-muted shadow-sm">
          Start tracking, or follow a share code, to see positions here.
        </p>
      )}
    </div>
  );
}
