import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** A labelled text input for staff forms, with its error tied to the field. */
export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        className="h-11 md:h-9"
        {...rest}
      />
      {error ? (
        <p id={`${id}-err`} className="text-[13px] text-err">
          {error}
        </p>
      ) : null}
    </div>
  );
}
