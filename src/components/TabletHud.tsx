import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BatteryFull,
  CheckCircle2,
  ClipboardList,
  Compass,
  Eye,
  Flame,
  LayoutGrid,
  MapPin,
  Package,
  Radio,
  Rocket,
  RotateCcw,
  Siren,
  Tablet,
  Wifi,
  X,
  XCircle,
} from 'lucide-react';
import {
  MINIGAMES_72,
  MINIGAME_MAP,
  MISSION_PHASES_6,
  PHASE_6_MAP,
  getMinigamesForPhase,
  getMinigamesForRoleAndPhase,
} from '../data/minigamesData';
import {
  CARGO_MODULES,
  DIFFICULTY_CONFIGS,
  ROCKET_MODULES,
  ROLES,
  ROLE_MAP,
  ROOM_MAP,
} from '../data/missionData';
import type {
  ActiveConflict,
  CargoModuleState,
  DifficultyId,
  MinigameInstanceState,
  MinigameWorkflowStatus,
  MissionPhaseNumber,
  MissionResources,
  RoleId,
  RoomId,
  SharedMissionState,
} from '../types/mission';

type IPadAppId = 'home' | 'tasks' | 'track' | 'rocket' | 'alert';

interface TabletHudProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeRole: RoleId;
  activeRoom: RoomId;
  difficulty: DifficultyId;
  currentPhase: MissionPhaseNumber;
  soloTestMode: boolean;
  resources: MissionResources;
  sharedState: SharedMissionState;
  minigameStates: Record<string, MinigameInstanceState>;
  installedModuleIds: string[];
  activeConflicts: ActiveConflict[];
  emergencyAlert: boolean;
  cargoStates?: Record<string, CargoModuleState>;
  explodedView: boolean;
  isLaunching: boolean;
  onOpenMinigame: (code: string) => void;
  onAdvancePhase: (targetPhase?: MissionPhaseNumber) => void;
  onSelectRoom: (roomId: RoomId) => void;
  onToggleExploded: () => void;
  onTriggerLaunch: () => void;
  onResetLaunch: () => void;
  onCallEmergencyMeeting: () => void;
  onCancelRedAlert: () => void;
}

const STATUS_SHORT: Record<MinigameWorkflowStatus, { label: string; cls: string }> = {
  no_iniciado: { label: 'Not Started', cls: 'text-slate-400 border-slate-700 bg-slate-900' },
  en_progreso: { label: 'In Progress', cls: 'text-sky-300 border-sky-500/50 bg-sky-950/60' },
  pendiente_revision: {
    label: 'In Review',
    cls: 'text-amber-300 border-amber-500/50 bg-amber-950/60',
  },
  validado: { label: 'Validated', cls: 'text-teal-300 border-teal-500/50 bg-teal-950/60' },
  requiere_cambios: {
    label: 'Recalculate',
    cls: 'text-rose-300 border-rose-500/60 bg-rose-950/70',
  },
  confirmado: {
    label: 'Confirmed',
    cls: 'text-emerald-300 border-emerald-500/50 bg-emerald-950/60',
  },
};

const STATION_KIND_LABEL: Record<string, string> = {
  computer: 'Workstation',
  whiteboard: 'Whiteboard',
  drawer: 'Field Drawer',
  bench: 'Test Bench',
  comms: 'Comms Desk',
  schedule: 'Master Schedule',
  'meeting-holo': 'Gates Holo Table',
};

export function TabletHud({
  isOpen,
  onOpenChange,
  activeRole,
  activeRoom,
  difficulty,
  currentPhase,
  soloTestMode,
  resources,
  sharedState,
  minigameStates,
  installedModuleIds,
  activeConflicts,
  emergencyAlert,
  cargoStates = {},
  explodedView,
  isLaunching,
  onOpenMinigame,
  onAdvancePhase,
  onSelectRoom,
  onToggleExploded,
  onTriggerLaunch,
  onResetLaunch,
  onCallEmergencyMeeting,
  onCancelRedAlert,
}: TabletHudProps) {
  const setIsOpen = onOpenChange;
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isPresented, setIsPresented] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const isMountedRef = useRef(isOpen);
  const [activeApp, setActiveApp] = useState<IPadAppId>('home');
  const [matrixPhase, setMatrixPhase] = useState<MissionPhaseNumber>(currentPhase);
  const [matrixRoleFilter, setMatrixRoleFilter] = useState<RoleId | 'all'>('all');
  const [clockText, setClockText] = useState(() =>
    new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }),
  );

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let closeTimer = 0;

    if (isOpen) {
      setIsClosing(false);
      isMountedRef.current = true;
      setIsMounted(true);
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          setIsPresented(true);
        });
      });
    } else if (isMountedRef.current) {
      setIsClosing(true);
      setIsPresented(false);
      closeTimer = window.setTimeout(() => {
        isMountedRef.current = false;
        setIsMounted(false);
        setIsClosing(false);
      }, 300);
    }

    return () => {
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      if (closeTimer) window.clearTimeout(closeTimer);
    };
  }, [isOpen, isMountedRef]);

  useEffect(() => {
    setMatrixPhase(currentPhase);
  }, [currentPhase]);

  useEffect(() => {
    if (!isMounted) return;
    const timer = window.setInterval(() => {
      setClockText(
        new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isMounted]);

  const diffCfg = DIFFICULTY_CONFIGS[difficulty];
  const roleDef = ROLE_MAP[activeRole];
  const currentPhaseMeta = PHASE_6_MAP[currentPhase];

  const myPhaseMinigames = getMinigamesForRoleAndPhase(activeRole, currentPhase);
  const myPendingInPhase = myPhaseMinigames.filter(
    (m) => minigameStates[m.code]?.status !== 'confirmado',
  );
  const phaseMinigames = getMinigamesForPhase(currentPhase);
  const phaseConfirmedCount = phaseMinigames.filter(
    (m) => minigameStates[m.code]?.status === 'confirmado',
  ).length;
  const totalConfirmedCount = MINIGAMES_72.filter(
    (m) => minigameStates[m.code]?.status === 'confirmado',
  ).length;

  const recalcCodes = sharedState.recalcRequiredCodes;
  const unresolvedConflicts = activeConflicts.filter((c) => !c.resolved);
  const launcherBadgeCount =
    recalcCodes.length + unresolvedConflicts.length + myPendingInPhase.length;

  const installedModules = ROCKET_MODULES.filter((m) => installedModuleIds.includes(m.id));
  const myCargoList = CARGO_MODULES.filter((def) => def.roleId === activeRole);
  const deliveredCargoCount = CARGO_MODULES.filter(
    (def) => cargoStates[def.id]?.delivered,
  ).length;

  const anexoPassedCount = sharedState.anexoCChecks.filter((c) => c.passed).length;
  const gateCodes = ['G13', 'G23', 'G43', 'G53'];

  const canAdvanceStandard =
    currentPhase < 6 &&
    phaseConfirmedCount >= 10 &&
    (!currentPhaseMeta.gateCode ||
      minigameStates[currentPhaseMeta.gateCode]?.status === 'confirmado');

  if (!isMounted) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Open Mission Tablet"
        className={`fixed bottom-4 right-4 z-30 group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#0C1322] border-2 shadow-2xl transition-colors cursor-pointer ${
          emergencyAlert || recalcCodes.length > 0 || unresolvedConflicts.length > 0
            ? 'border-rose-500 red-alert-strobe'
            : 'border-[#2A374E] hover:border-sky-400'
        }`}
      >
        <div className="relative w-12 h-9 rounded-lg bg-[#070B14] border-2 border-slate-600 flex items-center justify-center px-1.5">
          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full bg-slate-600" />
          <Tablet className="w-4 h-4 text-sky-400" />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-emerald-400" />
          {launcherBadgeCount > 0 && (
            <span className="absolute -top-2.5 -right-2.5 min-w-[20px] h-5 px-1 rounded-full bg-amber-500 text-slate-950 font-mono-tabular text-[11px] font-bold flex items-center justify-center shadow">
              {launcherBadgeCount}
            </span>
          )}
        </div>
        <div className="text-left pr-1">
          <div className="text-xs font-display font-bold text-white leading-tight">
            Mission Tablet
          </div>
          <div className="text-[10.5px] text-slate-400 font-mono-tabular leading-tight mt-0.5">
            {recalcCodes.length > 0
              ? `${recalcCodes.length} Recalc · P${currentPhase}/6`
              : `${roleDef.shortName} · P${currentPhase}/6 (${myPendingInPhase.length} pend.)`}
          </div>
        </div>
      </button>
    );
  }

  return (
    <aside
      aria-label="Mission Control Tablet"
      style={{
        transformOrigin: 'bottom right',
        transform: isPresented
          ? 'translate(0px, 0px) rotate(0deg) scale(1)'
          : isClosing
            ? 'translate(28%, 100%) rotate(-12deg) scale(0.38)'
            : 'translate(28%, 100%) rotate(-10deg) scale(0.42)',
        opacity: isPresented ? 1 : 0,
        transition: isClosing
          ? 'transform 300ms cubic-bezier(0.4, 0, 0.85, 0.45), opacity 220ms ease-in 80ms'
          : 'transform 400ms cubic-bezier(0.22, 1.12, 0.36, 1), opacity 160ms ease-out',
        willChange: 'transform, opacity',
      }}
      className={`fixed bottom-4 right-4 z-30 w-[min(960px,calc(100vw-2rem))] h-[min(610px,calc(100vh-5rem))] rounded-[28px] bg-[#141A24] border-[3px] border-[#2E394D] p-2.5 shadow-2xl flex items-stretch gap-2 ${
        isClosing ? 'pointer-events-none' : ''
      }`}
    >
      {/* Left Bezel */}
      <div className="w-4 shrink-0 flex flex-col items-center justify-center gap-3">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#090D16] border border-slate-600 flex items-center justify-center">
          <span className="w-1 h-1 rounded-full bg-sky-500/80" />
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
      </div>

      {/* Screen */}
      <div
        className="flex-1 min-w-0 rounded-[20px] border border-slate-800 flex flex-col overflow-hidden relative"
        style={{
          background:
            'radial-gradient(circle at 80% 18%, rgba(56, 189, 248, 0.16), transparent 46%), radial-gradient(circle at 18% 82%, rgba(99, 102, 241, 0.15), transparent 48%), linear-gradient(155deg, #060913 0%, #0C1426 55%, #070C18 100%)',
        }}
      >
        {/* Top Status Bar */}
        <header className="px-5 py-2 bg-[#070B16]/85 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 text-xs">
            <span className="font-mono-tabular font-semibold text-white">{clockText}</span>
            <span className="text-slate-600">·</span>
            <span
              className="w-2 h-2 rounded-xs shrink-0"
              style={{ backgroundColor: roleDef.colorHex }}
            />
            <span className="font-display font-bold text-slate-100 truncate">
              {roleDef.name}
            </span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-[11px] text-sky-300 hidden sm:inline truncate">
              {diffCfg.targetName}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono-tabular text-slate-300">
            <span className="hidden md:flex items-center gap-1 text-sky-400">
              <Radio className="w-3.5 h-3.5" />
              <span>KA-LINK</span>
            </span>
            <Wifi className="w-3.5 h-3.5 text-slate-200 hidden sm:block" />
            <span className="flex items-center gap-1 text-emerald-400">
              <span>{totalConfirmedCount}/72</span>
              <BatteryFull className="w-4 h-4" />
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close Tablet"
              className="ml-1 px-2.5 py-1 rounded-lg bg-[#131C2E] border border-slate-700 hover:border-sky-400 text-slate-200 hover:text-white text-[11px] font-sans font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
        </header>

        {/* Active App Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 flex flex-col">
          {activeApp === 'home' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-2">
              <div className="text-center space-y-1 max-w-2xl">
                <div className="text-[11px] font-mono-tabular uppercase tracking-widest text-sky-400">
                  {currentPhaseMeta.code} / 6 · {currentPhaseMeta.title}
                </div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                  {roleDef.roomName} · Personal Console
                </h2>
                <p className="text-xs text-slate-300">
                  {recalcCodes.length > 0
                    ? `Attention: ${recalcCodes.length} minigame(s) flagged for recalculation (${recalcCodes.join(', ')}).`
                    : myPendingInPhase.length > 0
                      ? `You have ${myPendingInPhase.length} pending minigame(s) in ${currentPhaseMeta.code}. Open them from "My Minigames".`
                      : `Your 3 minigames in ${currentPhaseMeta.code} are confirmed (${phaseConfirmedCount}/12 team total).`}
                </p>
              </div>

              {emergencyAlert && (
                <div className="w-full max-w-2xl rounded-2xl border border-rose-500/80 bg-[#2A090E]/95 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                  <div className="flex items-center gap-2 text-xs text-rose-100">
                    <Siren className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-semibold">
                      Red Alert Active — Contingency Meeting in the Gates Room
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onCancelRedAlert}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-100 text-rose-950 text-xs font-bold shadow cursor-pointer whitespace-nowrap"
                  >
                    Deactivate Red Alert
                  </button>
                </div>
              )}

              {/* 4 Main Apps */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
                <button
                  type="button"
                  onClick={() => setActiveApp('tasks')}
                  className="group flex flex-col items-center gap-2.5 cursor-pointer"
                >
                  <div
                    className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-[24px] border border-white/20 shadow-xl flex items-center justify-center transition-transform duration-150 group-hover:scale-105"
                    style={{ background: 'linear-gradient(150deg, #0ea5e9 0%, #2563eb 100%)' }}
                  >
                    <ClipboardList className="w-10 h-10 text-white" />
                    {myPendingInPhase.length > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[26px] h-[26px] px-1.5 rounded-full bg-rose-500 border-2 border-[#080D1B] text-white font-mono-tabular text-xs font-bold flex items-center justify-center shadow">
                        {myPendingInPhase.length}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-white group-hover:text-sky-300">
                    My Minigames
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveApp('track')}
                  className="group flex flex-col items-center gap-2.5 cursor-pointer"
                >
                  <div
                    className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-[24px] border border-white/20 shadow-xl flex items-center justify-center transition-transform duration-150 group-hover:scale-105"
                    style={{ background: 'linear-gradient(150deg, #14b8a6 0%, #0f766e 100%)' }}
                  >
                    <Compass className="w-10 h-10 text-white" />
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/45 font-mono-tabular text-[10px] font-bold text-white">
                      P{currentPhase}/6
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-white group-hover:text-teal-300">
                    6×12 Program
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveApp('rocket')}
                  className="group flex flex-col items-center gap-2.5 cursor-pointer"
                >
                  <div
                    className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-[24px] border border-white/20 shadow-xl flex items-center justify-center transition-transform duration-150 group-hover:scale-105"
                    style={{ background: 'linear-gradient(150deg, #475569 0%, #1e293b 100%)' }}
                  >
                    <Rocket className="w-10 h-10 text-white" />
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/55 font-mono-tabular text-[10px] font-bold text-emerald-300">
                      {anexoPassedCount}/6
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-white group-hover:text-amber-300">
                    State &amp; Annex C
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveApp('alert')}
                  className="group flex flex-col items-center gap-2.5 cursor-pointer"
                >
                  <div
                    className={`relative w-22 h-22 sm:w-24 sm:h-24 rounded-[24px] border border-white/25 shadow-xl flex items-center justify-center transition-transform duration-150 group-hover:scale-105 ${
                      emergencyAlert || recalcCodes.length > 0 ? 'red-alert-strobe' : ''
                    }`}
                    style={{ background: 'linear-gradient(150deg, #f43f5e 0%, #9f1239 100%)' }}
                  >
                    <Siren className="w-10 h-10 text-white" />
                    {(recalcCodes.length > 0 || unresolvedConflicts.length > 0) && (
                      <span className="absolute -top-2 -right-2 min-w-[26px] h-[26px] px-1.5 rounded-full bg-white border-2 border-rose-700 text-rose-700 font-mono-tabular text-xs font-bold flex items-center justify-center shadow">
                        {recalcCodes.length + unresolvedConflicts.length}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-rose-200 group-hover:text-white">
                    Gates &amp; Alerts
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* APP 1: MY MINIGAMES */}
          {activeApp === 'tasks' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    My Minigames — {currentPhaseMeta.code}: {currentPhaseMeta.title}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Active role: {roleDef.name} ({3 - myPendingInPhase.length}/3 confirmed in this phase · {phaseConfirmedCount}/12 team total).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeRoom !== roleDef.roomId && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectRoom(roleDef.roomId);
                        setIsOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-600 hover:border-sky-400 text-slate-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      <span>Go to {roleDef.shortName}</span>
                    </button>
                  )}

                  {currentPhase < 6 && (canAdvanceStandard || soloTestMode) && (
                    <button
                      type="button"
                      onClick={() => onAdvancePhase((currentPhase + 1) as MissionPhaseNumber)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Advance to Phase {currentPhase + 1}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                {myPhaseMinigames.map((mg) => {
                  const st = minigameStates[mg.code];
                  const stMeta = STATUS_SHORT[st?.status ?? 'no_iniciado'];
                  return (
                    <div
                      key={mg.code}
                      className={`rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        st?.dirtyNeedsRecalc
                          ? 'bg-[#251016] border-rose-500/65'
                          : st?.status === 'confirmado'
                            ? 'bg-[#0C1D1A] border-emerald-500/45'
                            : 'bg-[#0D1628] border-slate-700/80'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono-tabular text-xs font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            {mg.code}
                          </span>
                          <span className="font-display font-bold text-sm text-white">
                            {mg.title}
                          </span>
                          <span className={`px-2 py-0.5 rounded border text-[10.5px] font-mono-tabular ${stMeta.cls}`}>
                            {stMeta.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{mg.subtitle}</p>
                        <div className="text-[11px] text-slate-400">
                          Recommended 3D station:{' '}
                          <strong className="text-sky-300">
                            {STATION_KIND_LABEL[mg.stationKind] ?? mg.stationKind}
                          </strong>
                          {mg.dependsOnCodes.length > 0 && (
                            <> · Depends on {mg.dependsOnCodes.join(', ')}</>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onOpenMinigame(mg.code);
                          setIsOpen(false);
                        }}
                        className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Open Minigame
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Gate Cooperative Notice if phase has a Gate */}
              {currentPhaseMeta.gateCode && (
                <div className="rounded-xl border border-amber-500/40 bg-[#18140C] p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-display font-bold text-amber-300">
                      Phase {currentPhase} Cooperative Gate: {currentPhaseMeta.gateCode} ·{' '}
                      {MINIGAME_MAP[currentPhaseMeta.gateCode]?.title}
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Requires a vote from all 4 roles (Mechanic, Manager, Scientist, and Engineer) to seal the phase.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenMinigame(currentPhaseMeta.gateCode!);
                      setIsOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    Open Gate {currentPhaseMeta.gateCode}
                  </button>
                </div>
              )}

              {/* Fragile Physical Cargo */}
              {myCargoList.length > 0 && (
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-display font-bold text-slate-200 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Fragile Physical Cargo (Tractor Beam: Right Click / E)</span>
                    </h3>
                    <span className="font-mono-tabular text-[11px] text-slate-400">
                      {deliveredCargoCount}/{CARGO_MODULES.length} on Hangar Platform
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {myCargoList.map((cargo) => {
                      const st = cargoStates[cargo.id];
                      const integrity = st?.integrity ?? 100;
                      const delivered = Boolean(st?.delivered);
                      return (
                        <div
                          key={cargo.id}
                          className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-2 ${
                            delivered
                              ? 'bg-[#0C1D1A] border-emerald-500/40'
                              : 'bg-[#0D1628] border-slate-800'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {cargo.name}
                            </div>
                            <div className="text-[10.5px] text-slate-400">
                              {delivered
                                ? `Locked on Platform (+${cargo.scienceBonusOnDeliver} Science)`
                                : `In ${ROOM_MAP[cargo.originRoomId].shortLabel}`}
                            </div>
                          </div>
                          <span
                            className={`font-mono-tabular text-[11px] font-bold shrink-0 ${
                              delivered
                                ? 'text-emerald-400'
                                : integrity <= 45
                                  ? 'text-rose-400'
                                  : 'text-cyan-300'
                            }`}
                          >
                            {delivered ? 'Delivered' : `${integrity}%`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* APP 2: 6x12 PROGRAM (72 MINIGAMES MATRIX) */}
          {activeApp === 'track' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    Full Program — 6 Phases × 12 Minigames (72 Total)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Click any card to open the corresponding minigame and inspect its impact.
                  </p>
                </div>
                <span className="font-mono-tabular text-sm font-bold text-teal-300">
                  {totalConfirmedCount} / 72 Confirmed ({Math.round((totalConfirmedCount / 72) * 100)}%)
                </span>
              </div>

              {/* Phase tabs 1..6 */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {MISSION_PHASES_6.map((ph) => {
                  const list = getMinigamesForPhase(ph.number);
                  const done = list.filter(
                    (m) => minigameStates[m.code]?.status === 'confirmado',
                  ).length;
                  const active = matrixPhase === ph.number;
                  return (
                    <button
                      key={ph.number}
                      type="button"
                      onClick={() => setMatrixPhase(ph.number)}
                      className={`rounded-lg border px-2 py-2 text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-500/20 border-sky-400 text-white'
                          : 'bg-[#09101E] border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10.5px] font-mono-tabular font-bold">
                        <span className="text-sky-300">{ph.code}</span>
                        <span>{done}/12</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {ph.title}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Role Filter + Jump button */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMatrixRoleFilter('all')}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                      matrixRoleFilter === 'all'
                        ? 'bg-slate-800 border-slate-400 text-white'
                        : 'bg-[#09101E] border-slate-800 text-slate-400'
                    }`}
                  >
                    All (12)
                  </button>
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setMatrixRoleFilter(r.id)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                        matrixRoleFilter === r.id
                          ? 'bg-slate-800 border-slate-400 text-white'
                          : 'bg-[#09101E] border-slate-800 text-slate-400'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-xs"
                        style={{ backgroundColor: r.colorHex }}
                      />
                      <span>{r.shortName}</span>
                    </button>
                  ))}
                </div>

                {soloTestMode && matrixPhase !== currentPhase && (
                  <button
                    type="button"
                    onClick={() => onAdvancePhase(matrixPhase)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-200 text-[11px] font-bold cursor-pointer"
                  >
                    Activate {PHASE_6_MAP[matrixPhase].code} (Solo Test)
                  </button>
                )}
              </div>

              {/* 12 Minigames Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {getMinigamesForPhase(matrixPhase)
                  .filter((m) => matrixRoleFilter === 'all' || m.roleId === matrixRoleFilter)
                  .map((mg) => {
                    const st = minigameStates[mg.code];
                    const stMeta = STATUS_SHORT[st?.status ?? 'no_iniciado'];
                    const rDef = ROLE_MAP[mg.roleId];
                    return (
                      <button
                        key={mg.code}
                        type="button"
                        onClick={() => {
                          onOpenMinigame(mg.code);
                          setIsOpen(false);
                        }}
                        className="text-left rounded-xl border border-slate-800 bg-[#0B1222] hover:border-sky-400 p-3 space-y-1.5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="font-mono-tabular text-xs font-bold"
                            style={{ color: rDef.colorHex }}
                          >
                            {mg.code} · {rDef.shortName}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded border text-[9.5px] font-mono-tabular ${stMeta.cls}`}>
                            {stMeta.label}
                          </span>
                        </div>
                        <div className="text-xs font-display font-bold text-white truncate">
                          {mg.title}
                        </div>
                        <div className="text-[10.5px] text-slate-400 line-clamp-2 leading-snug">
                          {mg.subtitle}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* APP 3: SHARED STATE & ANNEX C */}
          {activeApp === 'rocket' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    Shared Mission State &amp; Annex C Audit
                  </h2>
                  <p className="text-xs text-slate-400">
                    {installedModules.length}/12 3D Modules Integrated in Hangar · {anexoPassedCount}/6 Annex C Pillars Passing
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeRoom !== 'hangar') onSelectRoom('hangar');
                      onToggleExploded();
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      explodedView
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-[#0E172A] border-slate-700 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{explodedView ? 'Collapse Rocket' : 'Exploded View'}</span>
                  </button>

                  {isLaunching ? (
                    <button
                      type="button"
                      onClick={onResetLaunch}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Pad</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onTriggerLaunch();
                        setIsOpen(false);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Simulate Launch</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 7 Domains Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-slate-800 bg-[#0D1628] p-2.5">
                  <div className="text-[10.5px] text-slate-400">Science / Coverage</div>
                  <div className="font-mono-tabular text-sm font-bold text-emerald-400">
                    {sharedState.objetivos.scienceScore} / {sharedState.objetivos.minScienceRequired} pts
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Coverage {sharedState.objetivos.coveragePct}% · Precision {sharedState.objetivos.precisionPct}%
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0D1628] p-2.5">
                  <div className="text-[10.5px] text-slate-400">Mass &amp; Volume</div>
                  <div
                    className={`font-mono-tabular text-sm font-bold ${
                      sharedState.masaVolumen.totalMassKg > sharedState.masaVolumen.maxMassKg
                        ? 'text-rose-400'
                        : 'text-white'
                    }`}
                  >
                    {sharedState.masaVolumen.totalMassKg.toLocaleString()} / {sharedState.masaVolumen.maxMassKg.toLocaleString()} kg
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {sharedState.masaVolumen.occupiedVolumeM3} / {sharedState.masaVolumen.maxVolumeM3} m³ · CoG ±{sharedState.masaVolumen.cgOffsetMm} mm
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0D1628] p-2.5">
                  <div className="text-[10.5px] text-slate-400">Power &amp; Eclipse</div>
                  <div
                    className={`font-mono-tabular text-sm font-bold ${
                      sharedState.energia.netMarginW < 25 ? 'text-rose-400' : 'text-sky-400'
                    }`}
                  >
                    {sharedState.energia.netMarginW >= 0 ? `+${sharedState.energia.netMarginW}` : sharedState.energia.netMarginW} W
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {sharedState.energia.batteryWh} Wh ({sharedState.energia.eclipseAutonomyHours} h eclipse)
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0D1628] p-2.5">
                  <div className="text-[10.5px] text-slate-400">Data &amp; RF Link</div>
                  <div className="font-mono-tabular text-sm font-bold text-teal-300">
                    {sharedState.comunicaciones.downlinkMbps} Mbps
                  </div>
                  <div className="text-[10px] text-slate-400">
                    SSR {sharedState.datos.generatedGB}/{sharedState.datos.storageCapacityGB} GB · {sharedState.comunicaciones.packetSuccessPct}%
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0D1628] p-2.5">
                  <div className="text-[10.5px] text-slate-400">Budget / UFE</div>
                  <div className="font-mono-tabular text-sm font-bold text-yellow-400">
                    ${sharedState.presupuestoCalendario.allocatedBudgetM}M / ${sharedState.presupuestoCalendario.maxBudgetM}M
                  </div>
                  <div className="text-[10px] text-slate-400">
                    UFE Reserve ${sharedState.presupuestoCalendario.contingencyReserveM}M
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0D1628] p-2.5">
                  <div className="text-[10.5px] text-slate-400">Critical Schedule</div>
                  <div className="font-mono-tabular text-sm font-bold text-white">
                    {sharedState.presupuestoCalendario.plannedDurationDays} / {sharedState.presupuestoCalendario.maxScheduleDays} d
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Slack {sharedState.presupuestoCalendario.criticalSlackDays} days
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0D1628] p-2.5">
                  <div className="text-[10.5px] text-slate-400">Risk &amp; Delta-V</div>
                  <div
                    className={`font-mono-tabular text-sm font-bold ${
                      sharedState.riesgoEstado.riskPct > sharedState.riesgoEstado.maxAllowedRiskPct
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {sharedState.riesgoEstado.riskPct}% · {sharedState.riesgoEstado.deltaVMps} m/s
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Target Δv &ge; {sharedState.riesgoEstado.minDeltaVMps} m/s
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0D1628] p-2.5">
                  <div className="text-[10.5px] text-slate-400">Vehicle Health</div>
                  <div className="font-mono-tabular text-sm font-bold text-sky-300">
                    {sharedState.riesgoEstado.vehicleHealthPct}%
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Gates {sharedState.riesgoEstado.gatesApproved.length}/4 · Mod {installedModules.length}/12
                  </div>
                </div>
              </div>

              {/* Annex C 6 Checks */}
              <div className="rounded-xl border border-slate-800 bg-[#09101E] p-3.5 space-y-2">
                <div className="text-xs font-display font-bold text-white">
                  Cross-Domain Validation — Annex C (6 Mandatory Pillars)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sharedState.anexoCChecks.map((ax) => (
                    <div
                      key={ax.id}
                      className={`rounded-lg border px-3 py-2 flex items-start justify-between gap-2 ${
                        ax.passed
                          ? 'bg-[#0C1D1A] border-emerald-500/40'
                          : 'bg-[#201016] border-rose-500/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white">{ax.label}</div>
                        <div className="text-[10.5px] text-slate-300 font-mono-tabular">
                          {ax.detail}
                        </div>
                      </div>
                      {ax.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* APP 4: GATES & ALERTS */}
          {activeApp === 'alert' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    Cooperative Gates &amp; Recalculation Queue
                  </h2>
                  <p className="text-xs text-slate-400">
                    When a previously confirmed decision changes, dependent minigames are flagged here for mandatory recalculation.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {emergencyAlert && (
                    <button
                      type="button"
                      onClick={onCancelRedAlert}
                      className="px-3 py-1.5 rounded-lg bg-white text-rose-950 text-xs font-bold cursor-pointer"
                    >
                      Deactivate Alert
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onCallEmergencyMeeting();
                      setIsOpen(false);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Siren className="w-3.5 h-3.5" />
                    <span>Go to Gates Room</span>
                  </button>
                </div>
              </div>

              {/* 4 Gates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {gateCodes.map((gCode) => {
                  const def = MINIGAME_MAP[gCode];
                  const st = minigameStates[gCode];
                  const approved = st?.status === 'confirmado';
                  return (
                    <button
                      key={gCode}
                      type="button"
                      onClick={() => {
                        onOpenMinigame(gCode);
                        setIsOpen(false);
                      }}
                      className={`text-left rounded-xl border p-3 flex items-center justify-between gap-2 cursor-pointer ${
                        approved
                          ? 'bg-[#0C1D1A] border-emerald-500/45'
                          : 'bg-[#12192A] border-amber-500/45 hover:border-amber-400'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-mono-tabular font-bold text-amber-300">
                          {gCode} · PHASE {def.phaseNumber}
                        </div>
                        <div className="text-sm font-display font-bold text-white">
                          {def.title}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-mono-tabular font-bold ${
                          approved ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {approved ? 'APPROVED' : 'VOTE'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Recalculation Queue */}
              <div className="rounded-xl border border-slate-800 bg-[#09101E] p-3.5 space-y-2">
                <div className="text-xs font-display font-bold text-white flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Minigames requiring recalculation ({recalcCodes.length})</span>
                </div>
                {recalcCodes.length === 0 ? (
                  <p className="text-xs text-emerald-300">
                    No desyncs: all confirmed dependencies are up to date.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {recalcCodes.map((rCode) => {
                      const def = MINIGAME_MAP[rCode];
                      return (
                        <div
                          key={rCode}
                          className="rounded-lg border border-rose-500/50 bg-[#231015] px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <div className="text-xs text-rose-100">
                            <strong className="font-mono-tabular mr-1.5">{rCode}</strong>
                            <span>{def?.title ?? rCode}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onOpenMinigame(rCode);
                              setIsOpen(false);
                            }}
                            className="px-2.5 py-1 rounded bg-rose-500 hover:bg-rose-400 text-slate-950 text-[11px] font-bold cursor-pointer"
                          >
                            Recalculate
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Dock */}
        <footer className="px-4 py-2 bg-[#070B16]/90 border-t border-slate-800 flex items-center justify-center gap-4 shrink-0">
          {(
            [
              { id: 'home', label: 'Home', icon: LayoutGrid },
              { id: 'tasks', label: 'Minigames', icon: ClipboardList },
              { id: 'track', label: 'Phases 1–6', icon: Compass },
              { id: 'rocket', label: 'Annex C', icon: Rocket },
              { id: 'alert', label: 'Gates', icon: Siren },
            ] as const
          ).map((dockItem) => {
            const Icon = dockItem.icon;
            const active = activeApp === dockItem.id;
            return (
              <button
                key={dockItem.id}
                type="button"
                onClick={() => setActiveApp(dockItem.id)}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{dockItem.label}</span>
              </button>
            );
          })}
        </footer>
      </div>
    </aside>
  );
}
