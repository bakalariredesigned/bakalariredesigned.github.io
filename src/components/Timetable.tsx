import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Loader, User, MapPin } from "lucide-react";
import { cn } from "../lib/utils";
import { bakalariService } from "../services/bakalariService";

const DAYS = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek"];
const DAYS_S = ["Po", "Út", "St", "Čt", "Pá"];
type ChangeKind = "normal" | "canceled" | "substitution" | "other";

const detectKind = (change: any): ChangeKind => {
  if (!change) return "normal";
  const ct = (change.ChangeType || change.TypeAbbrev || "").toLowerCase();
  const desc = (change.Description || change.TypeName || "").toLowerCase();
  if (
    ct.includes("cancel") ||
    ct.includes("removed") ||
    desc.includes("odpad") ||
    desc.includes("zruš")
  )
    return "canceled";
  if (ct.includes("substit") || desc.includes("supl")) return "substitution";
  return "other";
};

const CHANGE: Record<
  ChangeKind,
  { dot: string; bg: string; border: string; badge: string; label: string }
> = {
  normal: { dot: "", bg: "", border: "border-[#27272a]", badge: "", label: "" },
  canceled: {
    dot: "bg-rose-500",
    bg: "bg-rose-500/[0.07]",
    border: "border-rose-500/40",
    badge: "bg-rose-500/20 text-rose-400",
    label: "ODPADLÁ",
  },
  substitution: {
    dot: "bg-amber-400",
    bg: "bg-amber-500/[0.07]",
    border: "border-amber-500/40",
    badge: "bg-amber-500/20 text-amber-400",
    label: "SUPL.",
  },
  other: {
    dot: "bg-purple-400",
    bg: "bg-purple-500/[0.07]",
    border: "border-purple-500/40",
    badge: "bg-purple-500/20 text-purple-400",
    label: "ZMĚNA",
  },
};

interface Lesson {
  dayIdx: number;
  hourId: number;
  subjectId: string;
  teacherId: string;
  roomId: string;
  theme: string;
  changeKind: ChangeKind;
  changeDesc: string;
  beginTime: string;
  endTime: string;
}
interface Hour {
  Id: number;
  Caption?: string;
  BeginTime: string;
  EndTime: string;
}

export default function Timetable() {
  const todayDow = new Date().getDay() - 1; // 0=Mon
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDay, setActiveDay] = useState(
    Math.min(Math.max(todayDow, 0), 4),
  );
  const [ttData, setTtData] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [hours, setHours] = useState<Hour[]>([]);
  const [loading, setLoading] = useState(true);

  const getWeekDate = (o: number) => {
    const d = new Date();
    const dow = d.getDay() || 7;
    d.setDate(d.getDate() - dow + 1 + o * 7);
    return d.toISOString().slice(0, 10);
  };
  const weekLabel =
    weekOffset === 0
      ? "Tento týden"
      : weekOffset === 1
        ? "Příští týden"
        : weekOffset === -1
          ? "Minulý týden"
          : `Týden ${weekOffset > 0 ? "+" : ""}${weekOffset}`;
  const getDayDate = (i: number) => {
    const d = ttData?.Days?.[i]?.Date;
    if (!d) return "";
    const x = new Date(d);
    return `${x.getDate()}. ${x.getMonth() + 1}.`;
  };
  const getWeekRange = () => {
    if (!ttData?.Days?.length) return "";
    const fmt = (d: string) => {
      const x = new Date(d);
      return `${x.getDate()}. ${x.getMonth() + 1}.`;
    };
    try {
      return `${fmt(ttData.Days[0].Date)} – ${fmt(ttData.Days[ttData.Days.length - 1].Date)}`;
    } catch {
      return "";
    }
  };

  useEffect(() => {
    setLoading(true);
    setLessons([]);
    setHours([]);
    const date = weekOffset === 0 ? undefined : getWeekDate(weekOffset);
    bakalariService
      .getTimetable("actual", date)
      .then((data) => {
        if (data) {
          setTtData(data);
          setHours(data.Hours || []);
          const out: Lesson[] = [];
          (data.Days || []).forEach((day: any, di: number) => {
            (day.Atoms || []).forEach((atom: any) => {
              const hr = (data.Hours || []).find(
                (h: any) => h.Id === atom.HourId,
              );
              if (!hr) return;
              const ck = detectKind(atom.Change);
              out.push({
                dayIdx: di,
                hourId: atom.HourId,
                subjectId: atom.SubjectId,
                teacherId: atom.TeacherId,
                roomId: atom.RoomId,
                theme: atom.Theme || "",
                changeKind: ck,
                changeDesc:
                  atom.Change?.Description || atom.Change?.TypeName || "",
                beginTime: hr.BeginTime,
                endTime: hr.EndTime,
              });
            });
          });
          setLessons(out);
        }
      })
      .finally(() => setLoading(false));
  }, [weekOffset]);

  const sub = (id: string) => ttData?.Subjects?.find((s: any) => s.Id === id);
  const tch = (id: string) => ttData?.Teachers?.find((t: any) => t.Id === id);
  const rm = (id: string) => ttData?.Rooms?.find((r: any) => r.Id === id);
  const cell = (di: number, hid: number) =>
    lessons.find((l) => l.dayIdx === di && l.hourId === hid);

  // ── Desktop cell ──────────────────────────────────────────────
  const Cell = ({ l }: { l: Lesson }) => {
    const c = CHANGE[l.changeKind];
    const s = sub(l.subjectId);
    const t = tch(l.teacherId);
    const r = rm(l.roomId);
    const isCanceled = l.changeKind === "canceled";
    return (
      <div
        className={cn(
          "rounded-lg border p-2 h-full min-h-[72px] flex flex-col gap-0.5 text-[10px]",
          c.bg,
          c.border,
        )}
      >
        {l.changeKind !== "normal" && (
          <span
            className={cn(
              "text-[8px] font-bold uppercase tracking-widest px-1 py-0.5 rounded self-start mb-0.5",
              c.badge,
            )}
          >
            {c.label}
          </span>
        )}
        <p
          className={cn(
            "font-bold text-xs leading-tight",
            isCanceled ? "line-through text-[#52525b]" : "text-[#fafafa]",
          )}
        >
          {s?.Abbrev || "—"}
        </p>
        <p className="text-[#71717a] leading-tight truncate">
          {t?.Abbrev || ""}
        </p>
        <p
          className={cn(
            "font-mono mt-auto self-start px-1.5 py-0.5 rounded text-[8px]",
            isCanceled ? "text-[#52525b]" : "bg-[#27272a] text-[#a1a1aa]",
          )}
        >
          {r?.Abbrev || l.roomId || "?"}
        </p>
        {l.changeDesc && !isCanceled && (
          <p className="text-[8px] text-[#71717a] italic truncate leading-tight">
            {l.changeDesc}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[#fafafa]">
            Rozvrh hodin
          </h2>
          <p className="text-[#a1a1aa] text-sm">{getWeekRange()}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Week nav */}
          <div className="flex bg-[#18181b] border border-[#27272a] rounded-lg p-1">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-1.5 hover:bg-[#27272a] rounded text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="px-3 flex items-center text-xs font-medium text-[#fafafa] min-w-[120px] justify-center">
              {weekLabel}
            </div>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-1.5 hover:bg-[#27272a] rounded text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-[#71717a]">
        {(["normal", "canceled", "substitution", "other"] as ChangeKind[]).map(
          (k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-2 h-2 rounded-sm border",
                  CHANGE[k].dot
                    ? `${CHANGE[k].dot} opacity-70`
                    : "bg-[#18181b]",
                  CHANGE[k].border,
                )}
              />
              {k === "normal"
                ? "Normální"
                : k === "canceled"
                  ? "Odpadlá"
                  : k === "substitution"
                    ? "Suplování"
                    : "Jiná změna"}
            </span>
          ),
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="animate-spin text-indigo-400" size={24} />
        </div>
      ) : lessons.length === 0 ? (
        <div className="glass-card p-10 text-center text-[#71717a]">
          Rozvrh není k dispozici.
        </div>
      ) : (
        <>
          {/* ═══ DESKTOP: days on left, hours on top ═══ */}
          <div className="hidden md:block glass-card overflow-x-auto">
            <table
              className="w-full text-xs"
              style={{ minWidth: `${120 + hours.length * 90}px` }}
            >
              <thead>
                <tr className="border-b border-[#27272a]">
                  {/* Corner */}
                  <th className="w-[120px] px-3 py-3 text-left text-[10px] text-[#52525b] font-medium uppercase shrink-0">
                    Den
                  </th>
                  {hours.map((hr) => (
                    <th
                      key={hr.Id}
                      className="px-2 py-3 text-center min-w-[90px]"
                    >
                      <div className="text-[10px] font-bold text-[#fafafa]">
                        {hr.Caption ? `${hr.Caption}.` : ""}
                      </div>
                      <div className="text-[9px] text-[#71717a] font-normal">
                        {hr.BeginTime}
                      </div>
                      <div className="text-[9px] text-[#52525b] font-normal">
                        – {hr.EndTime}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]">
                {DAYS.map((day, di) => {
                  const isToday = di === todayDow;
                  const hasChanges =
                    lessons.filter(
                      (l) => l.dayIdx === di && l.changeKind !== "normal",
                    ).length > 0;
                  return (
                    <tr
                      key={di}
                      className={isToday ? "bg-indigo-500/[0.03]" : ""}
                    >
                      {/* Day label */}
                      <td className="px-3 py-2 shrink-0 align-middle">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              "text-xs font-semibold",
                              isToday ? "text-indigo-400" : "text-[#fafafa]",
                            )}
                          >
                            {day}
                          </div>
                          {hasChanges && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                              title="Jsou zde změny"
                            />
                          )}
                        </div>
                        <div className="text-[10px] text-[#52525b]">
                          {getDayDate(di)}
                        </div>
                      </td>
                      {/* Lesson cells */}
                      {hours.map((hr) => {
                        const l = cell(di, hr.Id);
                        return (
                          <td key={hr.Id} className="px-2 py-2 align-top">
                            {l ? (
                              <Cell l={l} />
                            ) : (
                              <div className="text-center text-[#3f3f46] text-[10px] py-4">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ═══ MOBILE: day tabs + list ═══ */}
          <div className="md:hidden space-y-4">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {DAYS.map((d, i) => {
                const isToday = i === todayDow;
                const isSelected = i === activeDay;
                const hasChanges =
                  lessons.filter(
                    (l) => l.dayIdx === i && l.changeKind !== "normal",
                  ).length > 0;
                return (
                  <button
                    key={d}
                    onClick={() => setActiveDay(i)}
                    className={cn(
                      "flex flex-col items-center px-3 py-2 rounded-lg border transition-all min-w-[56px] relative shrink-0",
                      isSelected
                        ? "bg-indigo-500 border-indigo-600 text-white"
                        : isToday
                          ? "bg-[#18181b] border-indigo-500/40 text-indigo-400"
                          : "bg-transparent text-[#71717a] border-[#27272a]",
                    )}
                  >
                    {hasChanges && !isSelected && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                    <span className="text-[9px] opacity-70">
                      {getDayDate(i)}
                    </span>
                    <span className="text-sm font-medium">{DAYS_S[i]}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              {hours
                .filter((hr) => cell(activeDay, hr.Id))
                .map((hr, i) => {
                  const l = cell(activeDay, hr.Id)!;
                  const c = CHANGE[l.changeKind];
                  const s = sub(l.subjectId);
                  const t = tch(l.teacherId);
                  const r = rm(l.roomId);
                  return (
                    <motion.div
                      key={hr.Id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={cn(
                        "glass-card p-3 flex items-center gap-3 border-l-[3px]",
                        c.bg,
                        c.border,
                        l.changeKind === "canceled"
                          ? "border-l-rose-500 opacity-75"
                          : l.changeKind === "substitution"
                            ? "border-l-amber-400"
                            : l.changeKind === "other"
                              ? "border-l-purple-400"
                              : "border-l-indigo-500/50",
                      )}
                    >
                      {/* Time */}
                      <div className="w-20 shrink-0 text-right">
                        <p className="text-xs font-semibold text-[#fafafa]">
                          {hr.BeginTime}
                        </p>
                        <p className="text-[9px] text-[#71717a]">
                          – {hr.EndTime}
                        </p>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {l.changeKind !== "normal" && (
                          <span
                            className={cn(
                              "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded inline-block mb-1",
                              c.badge,
                            )}
                          >
                            {c.label}
                          </span>
                        )}
                        <p
                          className={cn(
                            "text-sm font-semibold truncate",
                            l.changeKind === "canceled"
                              ? "line-through text-[#71717a]"
                              : "text-[#fafafa]",
                          )}
                        >
                          {s?.Name || s?.Abbrev || "—"}
                        </p>
                        <p className="text-[11px] text-[#a1a1aa]">
                          {t?.Name || t?.Abbrev || ""}
                        </p>
                        {l.changeDesc && (
                          <p className="text-[10px] text-[#71717a] italic">
                            {l.changeDesc}
                          </p>
                        )}
                      </div>
                      {/* Room */}
                      <span className="text-[10px] font-mono bg-[#27272a] text-[#a1a1aa] px-2 py-0.5 rounded shrink-0">
                        {r?.Abbrev || l.roomId || "?"}
                      </span>
                    </motion.div>
                  );
                })}
              {hours.filter((hr) => cell(activeDay, hr.Id)).length === 0 && (
                <div className="text-center py-10 text-[#71717a] text-sm">
                  Žádné hodiny v tento den.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
