import { MapClient } from "@/components/MapClient";
import { getMapData } from "@/lib/map-data";

export default async function MapPage() {
  const data = await getMapData();
  return <MapClient initialData={data} />;
}
