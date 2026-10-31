"use client";

import { useState } from "react";
import { formatCLP } from "@/lib/utils";

const WEEKS_PER_MONTH = 4.33;
const VU_SEGMENTS = 16;

// Calculadora de ingresos del anfitrión (precio por hora × horas reservadas por semana).
export function EarningsCalculator() {
  const [price, setPrice] = useState(20000);
  const [hours, setHours] = useState(16);
  const monthly = Math.round((price * hours * WEEKS_PER_MONTH) / 1000) * 1000;
  const lit = Math.round((hours / 60) * VU_SEGMENTS);

  return (
    <div className="calc panel">
      <p className="dim text-sm">Podrías generar al mes</p>
      <p className="big" aria-live="polite">
        {formatCLP(monthly)}
      </p>
      <p className="dim text-xs">Estimación. La tarifa de servicio de 10% la paga el cliente, aparte de tu precio.</p>
      <div className="vu-row" aria-hidden>
        {Array.from({ length: VU_SEGMENTS }, (_, i) => (
          <b key={i} className={`${i < lit ? "on" : ""} ${i >= 11 ? "h" : ""} ${i >= 14 ? "p" : ""}`} />
        ))}
      </div>
      <div className="ctl">
        <div className="lbl">
          <label htmlFor="calc-p">Precio por hora</label>
          <b>{formatCLP(price)}</b>
        </div>
        <input
          className="range"
          id="calc-p"
          type="range"
          min={8000}
          max={80000}
          step={1000}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
      </div>
      <div className="ctl">
        <div className="lbl">
          <label htmlFor="calc-h">Horas reservadas por semana</label>
          <b>{hours} h</b>
        </div>
        <input className="range" id="calc-h" type="range" min={2} max={60} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
      </div>
    </div>
  );
}
