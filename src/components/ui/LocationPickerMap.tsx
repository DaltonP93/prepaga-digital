import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons (broken by bundlers)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER: [number, number] = [-25.2867, -57.3333];
const DEFAULT_ZOOM = 13;

interface LocationPickerMapProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  className?: string;
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prevCoords = useRef<string>("");

  useEffect(() => {
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (key !== prevCoords.current) {
      prevCoords.current = key;
      map.setView([lat, lng], map.getZoom(), { animate: true });
    }
  }, [lat, lng, map]);

  return null;
}

export function LocationPickerMap({
  latitude,
  longitude,
  onLocationSelect,
  className = "h-56 w-full",
}: LocationPickerMapProps) {
  const hasCoords =
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const center: [number, number] = hasCoords
    ? [latitude!, longitude!]
    : DEFAULT_CENTER;

  return (
    <div className={`rounded-md overflow-hidden border ${className}`}>
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationSelect={onLocationSelect} />
        <MapCenterUpdater lat={center[0]} lng={center[1]} />
        {hasCoords && (
          <Marker
            position={[latitude!, longitude!]}
            draggable={true}
            eventHandlers={{
              dragend(e) {
                const marker = e.target as L.Marker;
                const pos = marker.getLatLng();
                onLocationSelect(pos.lat, pos.lng);
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
