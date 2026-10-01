import { forwardRef } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, className, id, ...props },
  ref
) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="block">
      <span className="label mb-1.5">{label}</span>
      <input ref={ref} id={inputId} className={`field ${className ?? ""}`} {...props} />
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-[var(--muted)]">{hint}</span>}
    </label>
  );
});
