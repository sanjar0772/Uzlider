"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from "react-leaflet";
import { cityCoords } from "@/lib/usCities";

const STATUS_COLOR: Record<string, string> = {
  NEW: "#94a3b8",
  ASSIGNED: "#3b66f5",
  IN_TRANSIT: "#f59e0b",
  DELIVERED: "#10b981",
  CANCELLED: "#ef4444",
};

type LoadLike = {
  id: string;
  refNumber: string;
  origin: string;
  destination: string;
  status: string;
};

export default function LoadMap({
  loads,
  height = 340,
}: {
  loads: LoadLike[];
  height?: number;
}) {
  const routes = loads
    .map((l) => {
      const a = cityCoords(l.origin);
      const b = cityCoords(l.destination);
      if (!a || !b) return null;
      return { ...l, a, b, color: STATUS_COLOR[l.status] ?? "#64748b" };
    })
    .filter(Boolean) as any[];

  return (
    <div style={{ height }} className="overflow-hidden rounded-xl">
      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        style={{ height: "100%", width: "100%", background: "#0b1220" }}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" />
        {routes.map((r) => (
          <Polyline
            key={r.id + "-line"}
            positions={[r.a, r.b]}
            pathOptions={{ color: r.color, weight: 2, opacity: 0.7, dashArray: "6 6" }}
          />
        ))}
        {routes.map((r) => (
          <CircleMarker
            key={r.id + "-o"}
            center={r.a}
            radius={4}
            pathOptions={{ color: r.color, fillColor: r.color, fillOpacity: 1, weight: 1 }}
          />
        ))}
        {routes.map((r) => (
          <CircleMarker
            key={r.id + "-d"}
            center={r.b}
            radius={5}
            pathOptions={{ color: r.color, fillColor: "#fff", fillOpacity: 1, weight: 2 }}
          >
            <Tooltip>
              {r.refNumber}: {r.origin} → {r.destination}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
