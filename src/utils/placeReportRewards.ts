import type { PlaceReport } from "../types";

const pendingStatus = "검토중";
const reflectionStatus = "지도 반영 대기";
const approvedStatus = "승인됨";
const legacyApprovedStatus = "승인";
const rejectedStatus = "반려";

function stableReportNumber(value: string) {
  return value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function getPlaceReportStatusLabel(report: Pick<PlaceReport, "status" | "mapReflectionStatus">) {
  const status = String(report.status);
  if (status === legacyApprovedStatus || status === approvedStatus) return approvedStatus;
  if (status === rejectedStatus) return rejectedStatus;
  if (status === pendingStatus) return pendingStatus;
  if (report.mapReflectionStatus === reflectionStatus) return reflectionStatus;
  return status || pendingStatus;
}

export function getPlaceReportViewCount(report: Pick<PlaceReport, "id" | "viewCount">) {
  if (typeof report.viewCount === "number") return report.viewCount;
  return 8 + (stableReportNumber(report.id) % 26);
}

export function getPlaceReportRewardPoints(report: Pick<PlaceReport, "id" | "rewardPoints" | "status">) {
  if (typeof report.rewardPoints === "number") return report.rewardPoints;
  const base = 10;
  const status = String(report.status);
  const approvedBonus = status === approvedStatus || status === legacyApprovedStatus ? 40 : 0;
  return base + approvedBonus + (stableReportNumber(report.id) % 7);
}

export function getPlaceReportSteps(report: Pick<PlaceReport, "status" | "mapReflectionStatus">) {
  const status = String(report.status);
  const activeSteps = [pendingStatus];
  if (report.mapReflectionStatus === reflectionStatus || status === legacyApprovedStatus || status === approvedStatus) activeSteps.push(reflectionStatus);
  if (status === legacyApprovedStatus || status === approvedStatus) activeSteps.push(approvedStatus);

  return [
    { label: pendingStatus, active: activeSteps.includes(pendingStatus) },
    { label: reflectionStatus, active: activeSteps.includes(reflectionStatus) },
    { label: approvedStatus, active: activeSteps.includes(approvedStatus) }
  ];
}
