"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: "#10b981",
  ON_LOAD: "#f59e0b",
  OFF_DUTY: "#94a3b8",
};

export type FleetDriver = {
  id: string;
  name: string;
  phone?: string | null;
  status: string;
  lat: number;
  lng: number;
  speed?: number | null;
  updatedAt?: string | null;
  truck?: string | null;
  currentLoad?: {
    refNumber: string;
    origin: string;
    destination: string;
    status: string;
  } | null;
};

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 9);
    } else {
      map.fitBounds(points as any, { padding: [40, 40], maxZoom: 10 });
    }
  }, [map, points]);
  return null;
}

function ago(iso?: string | null): string {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function FleetMap({
  fleet,
  height = 520,
}: {
  fleet: FleetDriver[];
  height?: number;
}) {
  const points = fleet.map((d) => [d.lat, d.lng] as [number, number]);

  return (
    <div style={{ height }} className="overflow-hidden rounded-xl">
      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        style={{ height: "100%", width: "100%", background: "#0b1220" }}
        scrollWheelZoom
        attributionControl={false}
      >
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" />
        <FitBounds points={points} />
        {fleet.map((d) => {
          const color = STATUS_COLOR[d.status] ?? "#3b66f5";
          return (
            <CircleMarker
              key={d.id}
              center={[d.lat, d.lng]}
              radius={8}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: color,
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {d.truck ? `Unit ${d.truck}` : "—"}
                    {d.phone ? ` · ${d.phone}` : ""}
                  </div>
                  {d.currentLoad ? (
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      <b>{d.currentLoad.refNumber}</b>
                      <br />
                      {d.currentLoad.origin} → {d.currentLoad.destination}
                    </div>
                  ) : null}
                  <div style={{ marginTop: 6, fontSize: 11, color: "#94a3b8" }}>
                    {ago(d.updatedAt)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
