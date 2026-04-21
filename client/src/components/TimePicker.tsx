import { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value: string; // "HH:MM" 24-h
  onChange: (value: string) => void;
  placeholder?: string;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_MARKS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function handCoords(index: number, total: number, r: number, cx: number, cy: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

export default function TimePicker({ value, onChange, placeholder = "Select time" }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [hour, setHour] = useState(12); // 1–12
  const [minute, setMinute] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Parse incoming value
  useEffect(() => {
    if (!value) return;
    const [h, m] = value.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return;
    setAmpm(h >= 12 ? "PM" : "AM");
    setHour(h % 12 === 0 ? 12 : h % 12);
    setMinute(m);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const emit = (h: number, m: number, ap: "AM" | "PM") => {
    let h24 = h % 12;
    if (ap === "PM") h24 += 12;
    onChange(`${pad(h24)}:${pad(m)}`);
  };

  const selectHour = (h: number) => {
    setHour(h);
    emit(h, minute, ampm);
    setMode("minute");
  };

  const selectMinute = (m: number) => {
    setMinute(m);
    emit(hour, m, ampm);
    setOpen(false);
    setMode("hour");
  };

  const toggleAmPm = (ap: "AM" | "PM") => {
    setAmpm(ap);
    emit(hour, minute, ap);
  };

  const display = value
    ? (() => {
        const [h, m] = value.split(":").map(Number);
        if (isNaN(h) || isNaN(m)) return "";
        const ap = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${pad(h12)}:${pad(m)} ${ap}`;
      })()
    : "";

  // SVG clock dimensions
  const SIZE = 220;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const OUTER_R = 85; // number positions
  const HAND_R = 70;  // hand tip

  const items = mode === "hour" ? HOURS : MINUTE_MARKS;
  const handAngle =
    mode === "hour"
      ? ((HOURS.indexOf(hour)) / 12) * 2 * Math.PI - Math.PI / 2
      : (minute / 60) * 2 * Math.PI - Math.PI / 2;

  const handX = CX + HAND_R * Math.cos(handAngle);
  const handY = CY + HAND_R * Math.sin(handAngle);

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setMode("hour"); }}
        className="w-full flex items-center gap-2 border border-brand-card-border rounded-[10px] px-4 py-3 text-[14px] bg-white focus:ring-2 focus:ring-brand-dark/20 text-left"
      >
        <Clock className="w-4 h-4 text-gray-placeholder shrink-0" />
        <span className={display ? "text-gray-text" : "text-gray-placeholder"}>
          {display || placeholder}
        </span>
      </button>

      {/* Dropdown clock */}
      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 bg-white border border-brand-card-border rounded-2xl shadow-xl p-4 w-[260px]">
          {/* Selected time display */}
          <div className="flex items-center justify-center gap-1 mb-3">
            <button
              type="button"
              onClick={() => setMode("hour")}
              className={`text-[28px] font-extrabold leading-none transition-colors ${
                mode === "hour" ? "text-brand-dark" : "text-gray-300"
              }`}
            >
              {pad(hour)}
            </button>
            <span className="text-[28px] font-extrabold text-gray-300">:</span>
            <button
              type="button"
              onClick={() => setMode("minute")}
              className={`text-[28px] font-extrabold leading-none transition-colors ${
                mode === "minute" ? "text-brand-dark" : "text-gray-300"
              }`}
            >
              {pad(minute)}
            </button>
            {/* AM/PM */}
            <div className="flex flex-col ml-2 gap-0.5">
              {(["AM", "PM"] as const).map((ap) => (
                <button
                  key={ap}
                  type="button"
                  onClick={() => toggleAmPm(ap)}
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                    ampm === ap
                      ? "bg-brand-dark text-white"
                      : "text-gray-400 hover:text-brand-dark"
                  }`}
                >
                  {ap}
                </button>
              ))}
            </div>
          </div>

          {/* Mode label */}
          <p className="text-center text-[11px] font-semibold text-gray-muted uppercase tracking-wide mb-2">
            {mode === "hour" ? "Select Hour" : "Select Minute"}
          </p>

          {/* Clock face */}
          <div className="flex justify-center">
            <svg width={SIZE} height={SIZE}>
              {/* Face circle */}
              <circle cx={CX} cy={CY} r={SIZE / 2 - 4} fill="#F0FDF4" stroke="#D1FAE5" strokeWidth={1.5} />

              {/* Hand */}
              <line
                x1={CX} y1={CY}
                x2={handX} y2={handY}
                stroke="#166534" strokeWidth={2} strokeLinecap="round"
              />
              {/* Center dot */}
              <circle cx={CX} cy={CY} r={4} fill="#166534" />

              {/* Numbers */}
              {items.map((item, i) => {
                const { x, y } = handCoords(i, items.length, OUTER_R, CX, CY);
                const isSelected = mode === "hour" ? item === hour : item === minute;
                return (
                  <g key={item} onClick={() => mode === "hour" ? selectHour(item as number) : selectMinute(item as number)} style={{ cursor: "pointer" }}>
                    <circle cx={x} cy={y} r={16} fill={isSelected ? "#166534" : "transparent"} />
                    <text
                      x={x} y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={13}
                      fontWeight={isSelected ? "700" : "500"}
                      fill={isSelected ? "white" : "#374151"}
                    >
                      {mode === "minute" ? pad(item as number) : item}
                    </text>
                  </g>
                );
              })}

              {/* Hand tip circle */}
              <circle cx={handX} cy={handY} r={5} fill="#166534" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
