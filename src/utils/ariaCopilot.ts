import { MINIGAMES_72, PHASE_6_MAP } from '../data/minigamesData';
import { DIFFICULTY_CONFIGS, ROLE_MANUAL_GUIDES, ROLE_MAP } from '../data/missionData';
import type {
  DifficultyId,
  MinigameInstanceState,
  MissionPhaseNumber,
  RoleId,
  SharedMissionState,
} from '../types/mission';

export interface AriaContext {
  activeRole: RoleId;
  difficulty: DifficultyId;
  currentPhase: MissionPhaseNumber;
  sharedState: SharedMissionState;
  minigameStates: Record<string, MinigameInstanceState>;
}

export interface AriaChatMessage {
  id: string;
  sender: 'aria' | 'user';
  text: string;
  timestamp: string;
}

export const ARIA_QUICK_PROMPTS = [
  'Which minigame should I do next?',
  'How do I pass the Gate and Annex C?',
  'What is my role responsibility?',
] as const;

export function buildAriaGreeting(ctx: AriaContext): string {
  const roleDef = ROLE_MAP[ctx.activeRole];
  const diffCfg = DIFFICULTY_CONFIGS[ctx.difficulty];
  const phaseMeta = PHASE_6_MAP[ctx.currentPhase];
  const myPhaseMinigames = MINIGAMES_72.filter(
    (m) => m.phaseNumber === ctx.currentPhase && m.roleId === ctx.activeRole,
  );
  const pending = myPhaseMinigames.filter(
    (m) => ctx.minigameStates[m.code]?.status !== 'confirmado',
  );
  const dirtyCount = ctx.sharedState.recalcRequiredCodes.length;

  const lines: string[] = [
    `Hello, ${roleDef.name}. I am A.R.I.A., your operations assistant.`,
    `Campaign: ${diffCfg.label} (${diffCfg.targetName}) · ${phaseMeta.code}: ${phaseMeta.title}.`,
  ];

  if (dirtyCount > 0) {
    lines.push(
      `Attention: ${dirtyCount} minigame(s) require recalculation (${ctx.sharedState.recalcRequiredCodes.join(', ')}) after a shared state change.`,
    );
  } else if (pending.length > 0) {
    const next = pending[0];
    lines.push(
      `Next step: you have ${pending.length}/3 minigames left in ${phaseMeta.code}. Open "${next.code} · ${next.title}" directly from this workstation or your Tablet.`,
    );
  } else {
    lines.push(
      `You have confirmed all your ${phaseMeta.code} minigames. Coordinate with your crew or open Gate ${phaseMeta.gateCode ?? 'next'} in the Briefing Room.`,
    );
  }

  return lines.join('\n\n');
}

export function buildAriaResponse(rawQuery: string, ctx: AriaContext): string {
  const q = rawQuery.trim().toLowerCase();
  const roleDef = ROLE_MAP[ctx.activeRole];
  const roleGuide = ROLE_MANUAL_GUIDES[ctx.activeRole];
  const diffCfg = DIFFICULTY_CONFIGS[ctx.difficulty];
  const phaseMeta = PHASE_6_MAP[ctx.currentPhase];
  const myPhaseMinigames = MINIGAMES_72.filter(
    (m) => m.phaseNumber === ctx.currentPhase && m.roleId === ctx.activeRole,
  );
  const pending = myPhaseMinigames.filter(
    (m) => ctx.minigameStates[m.code]?.status !== 'confirmado',
  );

  if (q.includes('role') || q.includes('responsibility') || q.includes('objective') || q.includes('goal')) {
    const bullets = roleGuide.whyTeamNeedsYou.map((line, i) => `${i + 1}. ${line}`).join('\n');
    return [
      `${roleDef.name} — "${roleDef.focusQuestion}"`,
      roleGuide.globalResponsibility,
      `Key coordination points:\n${bullets}`,
      roleGuide.meetingCoordination,
    ].join('\n\n');
  }

  if (q.includes('gate') || q.includes('annex') || q.includes('launch') || q.includes('ready')) {
    const failed = ctx.sharedState.anexoCChecks.filter((a) => !a.passed);
    const gates = ctx.sharedState.riesgoEstado.gatesApproved;
    const summaryLines =
      failed.length === 0
        ? ['All 6 cross-cutting Annex C pillars are green.']
        : failed.map((f) => `• ${f.domain}: ${f.label} (Current: ${f.detail})`);

    return [
      `Annex C Audit (${diffCfg.targetName}) · Gates approved: ${gates.length}/4 (${gates.join(', ') || 'none'})`,
      summaryLines.join('\n'),
      phaseMeta.gateCode
        ? `In ${phaseMeta.code}, remember to gather all 4 votes at Gate ${phaseMeta.gateCode} from the Briefing Room.`
        : `Keep confirming your minigames to complete ${phaseMeta.code}.`,
    ].join('\n\n');
  }

  const phaseAll = MINIGAMES_72.filter((m) => m.phaseNumber === ctx.currentPhase);
  const phaseConfirmed = phaseAll.filter(
    (m) => ctx.minigameStates[m.code]?.status === 'confirmado',
  ).length;

  if (pending.length > 0) {
    const next = pending[0];
    return [
      `Immediate plan in ${phaseMeta.code} (${phaseConfirmed}/${phaseAll.length} team minigames confirmed in this phase):`,
      `1. Open ${next.code} · "${next.title}" (${next.mechanicSummary}).`,
      `2. Use "Check / Simulate" to validate mandatory rules before confirming.`,
      `3. After confirming, check if any dependent minigame flagged "Recalculation Required".`,
    ].join('\n\n');
  }

  const dirty = ctx.sharedState.recalcRequiredCodes;
  if (dirty.length > 0) {
    return [
      `Your ${phaseMeta.code} minigames are confirmed, but pending recalculations remain: ${dirty.join(', ')}.`,
      `Open them from your Tablet or Holo Table and re-validate to clear the shared state.`,
    ].join('\n\n');
  }

  return [
    `You completed all your minigames in ${phaseMeta.code} (${phaseConfirmed}/12 team total).`,
    `Review the other 3 roles' progress in the "6×12 Program" tab on your Tablet or vote on Gate ${phaseMeta.gateCode ?? 'current'} in the Briefing Room.`,
  ].join('\n\n');
}
