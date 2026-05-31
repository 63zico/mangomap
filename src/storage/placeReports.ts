import AsyncStorage from "@react-native-async-storage/async-storage";

import { isSupabaseConfigured, supabaseDeleteById, supabaseSelect, supabaseUpsert } from "../services/supabaseClient";
import type { PlaceReport } from "../types";

const STORAGE_KEY = "tripbuddy:vietnam:place-reports";
const TABLE_NAME = "place_reports";

type PlaceReportRow = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  status: string;
  city: string;
  reporter_type: string;
  reporter_id?: string | null;
  name: string;
  google_maps_uri: string;
  area: string;
  category: string;
  price_level: string;
  reason: string;
  map_reflection_status?: string | null;
  view_count?: number | null;
  reward_points?: number | null;
};

function normalizeReport(report: PlaceReport): PlaceReport {
  return {
    ...report,
    mapReflectionStatus: report.mapReflectionStatus ?? "검토중",
    viewCount: report.viewCount ?? 0,
    rewardPoints: report.rewardPoints ?? 10,
    updatedAt: report.updatedAt ?? report.createdAt
  };
}

function fromSupabaseRow(row: PlaceReportRow): PlaceReport {
  return normalizeReport({
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    status: row.status as PlaceReport["status"],
    city: row.city as PlaceReport["city"],
    reporterType: row.reporter_type as PlaceReport["reporterType"],
    reporterId: row.reporter_id ?? undefined,
    name: row.name,
    googleMapsUri: row.google_maps_uri,
    area: row.area,
    category: row.category as PlaceReport["category"],
    priceLevel: row.price_level as PlaceReport["priceLevel"],
    reason: row.reason,
    mapReflectionStatus: (row.map_reflection_status ?? "검토중") as PlaceReport["mapReflectionStatus"],
    viewCount: row.view_count ?? 0,
    rewardPoints: row.reward_points ?? 10
  });
}

function toSupabaseRow(report: PlaceReport): PlaceReportRow {
  const normalizedReport = normalizeReport(report);

  return {
    id: normalizedReport.id,
    created_at: normalizedReport.createdAt,
    updated_at: normalizedReport.updatedAt,
    status: normalizedReport.status,
    city: normalizedReport.city,
    reporter_type: normalizedReport.reporterType,
    reporter_id: normalizedReport.reporterId ?? null,
    name: normalizedReport.name,
    google_maps_uri: normalizedReport.googleMapsUri,
    area: normalizedReport.area,
    category: normalizedReport.category,
    price_level: normalizedReport.priceLevel,
    reason: normalizedReport.reason,
    map_reflection_status: normalizedReport.mapReflectionStatus,
    view_count: normalizedReport.viewCount,
    reward_points: normalizedReport.rewardPoints
  };
}

async function loadLocalPlaceReports(): Promise<PlaceReport[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return (JSON.parse(raw) as PlaceReport[]).map(normalizeReport);
}

async function persistLocalPlaceReports(reports: PlaceReport[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reports.map(normalizeReport)));
}

export async function loadPlaceReports(): Promise<PlaceReport[]> {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supabaseSelect<PlaceReportRow>(TABLE_NAME, "select=*&order=created_at.desc");
      const reports = rows.map(fromSupabaseRow);
      await persistLocalPlaceReports(reports);
      return reports;
    } catch {
      return loadLocalPlaceReports();
    }
  }

  return loadLocalPlaceReports();
}

export async function savePlaceReport(report: PlaceReport): Promise<PlaceReport[]> {
  const normalizedReport = normalizeReport(report);
  const reports = await loadLocalPlaceReports();
  const nextReports = [normalizedReport, ...reports.filter((item) => item.id !== normalizedReport.id)];
  await persistLocalPlaceReports(nextReports);

  if (isSupabaseConfigured()) {
    try {
      await supabaseUpsert<PlaceReportRow>(TABLE_NAME, toSupabaseRow(normalizedReport));
    } catch {
      return nextReports;
    }
  }

  return nextReports;
}

export async function deletePlaceReport(reportId: string): Promise<PlaceReport[]> {
  const reports = await loadLocalPlaceReports();
  const nextReports = reports.filter((item) => item.id !== reportId);
  await persistLocalPlaceReports(nextReports);

  if (isSupabaseConfigured()) {
    try {
      await supabaseDeleteById(TABLE_NAME, reportId);
    } catch {
      return nextReports;
    }
  }

  return nextReports;
}
