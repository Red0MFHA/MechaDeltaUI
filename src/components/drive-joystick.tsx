"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const MAX_LINEAR = 0.22;
const MAX_ANGULAR = 0.65;
const SEND_HZ = 12;
const DEADZONE = 0.12;
/** Pad diameter in Tailwind size-44 units (11rem ≈ 176px); knob travel radius in px. */
const KNOB_TRAVEL_PX = 56;

export type DriveTwist = { linearX: number; angularZ: number };

type Props = {
  disabled?: boolean;
  className?: string;
  onTwist: (twist: DriveTwist) => void;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Virtual stick: hold and drag (or WASD) to stream continuous cmd_vel. */
export function DriveJoystick({ disabled, className, onTwist }: Props) {
  const padRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const keysRef = useRef({ f: false, b: false, l: false, r: false });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const twistRef = useRef<DriveTwist>({ linearX: 0, angularZ: 0 });
  const onTwistRef = useRef(onTwist);
  onTwistRef.current = onTwist;

  const applyNorm = useCallback((nx: number, ny: number) => {
    const mag = Math.hypot(nx, ny);
    let x = nx;
    let y = ny;
    if (mag > 1) {
      x /= mag;
      y /= mag;
    }
    if (mag < DEADZONE) {
      x = 0;
      y = 0;
    }
    setKnob({ x, y });
    // Screen: +y down → forward is drag up (negative y)
    const twist = {
      linearX: -y * MAX_LINEAR,
      angularZ: -x * MAX_ANGULAR,
    };
    twistRef.current = twist;
    return twist;
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    pointerIdRef.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    twistRef.current = { linearX: 0, angularZ: 0 };
    onTwistRef.current({ linearX: 0, angularZ: 0 });
  }, []);

  const pointFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const el = padRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radius = Math.min(rect.width, rect.height) / 2;
      const nx = clamp((clientX - cx) / radius, -1, 1);
      const ny = clamp((clientY - cy) / radius, -1, 1);
      applyNorm(nx, ny);
    },
    [applyNorm],
  );

  // Stream while held so the robot keeps moving under slow sim RTF.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!activeRef.current) return;
      onTwistRef.current(twistRef.current);
    }, 1000 / SEND_HZ);
    return () => window.clearInterval(id);
  }, []);

  // WASD / arrows as a second stick
  useEffect(() => {
    if (disabled) return;

    const syncKeys = () => {
      const k = keysRef.current;
      const ny = (k.b ? 1 : 0) + (k.f ? -1 : 0);
      const nx = (k.r ? 1 : 0) + (k.l ? -1 : 0);
      if (!nx && !ny) {
        if (!pointerIdRef.current && activeRef.current) stop();
        return;
      }
      activeRef.current = true;
      setActive(true);
      applyNorm(nx, ny);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      let used = true;
      if (e.key === "w" || e.key === "ArrowUp") keysRef.current.f = true;
      else if (e.key === "s" || e.key === "ArrowDown") keysRef.current.b = true;
      else if (e.key === "a" || e.key === "ArrowLeft") keysRef.current.l = true;
      else if (e.key === "d" || e.key === "ArrowRight") keysRef.current.r = true;
      else used = false;
      if (used) {
        e.preventDefault();
        syncKeys();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "ArrowUp") keysRef.current.f = false;
      else if (e.key === "s" || e.key === "ArrowDown") keysRef.current.b = false;
      else if (e.key === "a" || e.key === "ArrowLeft") keysRef.current.l = false;
      else if (e.key === "d" || e.key === "ArrowRight") keysRef.current.r = false;
      else return;
      syncKeys();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [applyNorm, disabled, stop]);

  useEffect(() => {
    if (disabled) stop();
  }, [disabled, stop]);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        ref={padRef}
        role="application"
        aria-label="Drive joystick"
        className={cn(
          "relative mx-auto size-44 touch-none select-none rounded-full border border-border bg-surface-muted",
          "shadow-inner",
          disabled && "opacity-50",
          active && "border-primary/50",
        )}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          pointerIdRef.current = e.pointerId;
          activeRef.current = true;
          setActive(true);
          pointFromEvent(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!activeRef.current || pointerIdRef.current !== e.pointerId) return;
          pointFromEvent(e.clientX, e.clientY);
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
      >
        {/* Crosshair center mark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="size-1.5 rounded-full bg-border" />
        </div>
        {/* Knob: position from center via left/top; transform only recenters the knob itself */}
        <div
          className={cn(
            "pointer-events-none absolute size-14 rounded-full",
            "border border-border bg-surface shadow-sm",
            active && "border-primary/40 bg-primary/15",
          )}
          style={{
            left: `calc(50% + ${knob.x * KNOB_TRAVEL_PX}px)`,
            top: `calc(50% + ${knob.y * KNOB_TRAVEL_PX}px)`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Hold and drag, or use WASD / arrow keys. Release to stop.
      </p>
    </div>
  );
}
