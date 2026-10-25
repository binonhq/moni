"use client";
import { useRef, type InputHTMLAttributes } from "react";
import { formatAmountInput, normalizeAmount } from "@/lib/amount-input";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string; onValueChange: (value: string) => void; allowEmpty?: boolean;
};
export function MoneyInput({ value, onValueChange, allowEmpty = false, onFocus, onKeyDown, ...props }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const display = formatAmountInput(value || (allowEmpty ? "" : "0"));
  function change(text: string, caret: number) {
    if (/[^\d.,\s]/.test(text)) return;
    const digits = text.replace(/\D/g, "");
    const next = normalizeAmount(text, allowEmpty);
    if (next.length > 16) return;
    const removedZeros = digits.length - (digits ? next.length : 0);
    const digitPosition = Math.max(0, text.slice(0, caret).replace(/\D/g, "").length - removedZeros);
    onValueChange(next);
    requestAnimationFrame(() => {
      const element = input.current; if (!element || document.activeElement !== element) return;
      const formatted = formatAmountInput(next); let position = 0; let count = 0;
      while (position < formatted.length && count < digitPosition) { if (/\d/.test(formatted[position])) count++; position++; }
      if (next === "0") position = 1;
      element.setSelectionRange(position, position);
    });
  }
  return <input {...props} ref={input} type="text" inputMode="numeric" autoComplete="off" value={display}
    onFocus={event => { if (value === "0" || !value) event.currentTarget.select(); onFocus?.(event); }}
    onChange={event => change(event.target.value, event.target.selectionStart ?? event.target.value.length)}
    onKeyDown={event => {
      onKeyDown?.(event); if (event.defaultPrevented) return;
      const element = event.currentTarget; const start = element.selectionStart ?? 0;
      if (start !== element.selectionEnd) return;
      if (event.key === "Backspace" && display[start - 1] === ".") {
        event.preventDefault(); change(display.slice(0, start - 2) + display.slice(start), start - 2);
      } else if (event.key === "Delete" && display[start] === ".") {
        event.preventDefault(); change(display.slice(0, start) + display.slice(start + 2), start);
      }
    }} />;
}
