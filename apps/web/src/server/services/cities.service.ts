import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import * as profilesRepo from "../repos/profiles.repo";

interface CitySearchResult {
  id: number;
  name: string;
  admin1?: string | null;
  country_name: string;
  country_iso2: string;
  lat: number;
  lon: number;
  population: number | null;
}

export async function searchCities(
  sb: SupabaseClient,
  query: string,
  country: string | null,
  limit: number
) {
  const { data, error } = await profilesRepo.searchCities(
    sb,
    query,
    country,
    limit
  );

  if (error) {
    throw new Error(error.message);
  }

  return {
    items: (data ?? []).map((d: CitySearchResult) => ({
      id: d.id,
      label: `${d.name}${d.admin1 ? `, ${d.admin1}` : ""} (${d.country_name})`,
      name: d.name,
      admin1: d.admin1,
      country: d.country_name,
      iso2: d.country_iso2,
      lat: d.lat,
      lon: d.lon,
      population: d.population,
    })),
  };
}
