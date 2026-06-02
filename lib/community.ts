import { intensityLabel, stackLabels } from "@/lib/life";
import type { CommunityProofKind, LifeEntry } from "@/types/domain";

export const proofKindLabels: Record<CommunityProofKind, string> = {
  daily_better: "오늘의 Better",
  challenge_day: "7일 챌린지",
  weekly_share: "주간 공유"
};

export const proofKindOptions: { value: CommunityProofKind; label: string }[] = [
  { value: "daily_better", label: proofKindLabels.daily_better },
  { value: "challenge_day", label: proofKindLabels.challenge_day },
  { value: "weekly_share", label: proofKindLabels.weekly_share }
];

export function buildProofTitle(
  authorName: string,
  proofKind: CommunityProofKind,
  challengeDay: number | null
) {
  if (proofKind === "challenge_day") {
    return `${authorName}님이 7일 챌린지 ${challengeDay ?? 1}일차를 완료했습니다.`;
  }

  if (proofKind === "weekly_share") {
    return `${authorName}님이 이번 주의 Better를 공유했습니다.`;
  }

  return `${authorName}님이 오늘의 Better를 완료했습니다.`;
}

export function formatLifeEntryProofSummary(entry: LifeEntry) {
  const stack = stackLabels[entry.stack];

  if (entry.stack === "move") {
    const duration = entry.durationMinutes ? `${entry.durationMinutes}분 ` : "";
    return `${stack} · ${duration}${entry.category} · ${intensityLabel(entry.intensity)}`;
  }

  if (entry.stack === "meal") {
    return `${stack} · ${entry.title}`;
  }

  if (entry.stack === "recovery") {
    const duration = entry.durationMinutes ? ` · ${entry.durationMinutes}분` : "";
    return `${stack} · ${entry.category}${duration}`;
  }

  const duration = entry.durationMinutes ? ` · ${entry.durationMinutes}분` : "";
  return `${stack} · ${entry.category}${duration}`;
}

export function buildProofBody(summary: string, quote: string) {
  return `${summary.trim()}\n\n"${quote.trim()}"`;
}

export function splitProofBody(body: string) {
  const [summary, ...rest] = body.split(/\n+/);
  return {
    summary: summary?.trim() ?? "",
    quote: rest.join("\n").trim()
  };
}
