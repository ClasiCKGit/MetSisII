import { useId, type ComponentProps } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

// Estos dos componentes encapsulan el patrón Controller + Field que se repite en todos los
// formularios (ver LoginPage, que lo muestra explícito). Reciben el `control` del formulario
// y el nombre del campo; el resto (valor, errores, aria-invalid, ids) lo resuelven solos.

interface FieldBaseProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
}

type TextFieldProps<T extends FieldValues> = FieldBaseProps<T> &
  Omit<ComponentProps<typeof Input>, "name" | "value" | "defaultValue" | "onChange" | "onBlur"> & {
    // Se llama con el texto nuevo, además de actualizar el formulario
    onValueChange?: (value: string) => void;
  };

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  onValueChange,
  ...inputProps
}: TextFieldProps<T>) {
  // useId evita ids repetidos si hay dos formularios con un campo del mismo nombre
  const inputId = `${useId()}-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
          <Input
            {...inputProps}
            {...field}
            // Los campos de texto siempre son strings; el tipo genérico no lo sabe
            value={(field.value as string | undefined) ?? ""}
            onChange={(event) => {
              field.onChange(event);
              onValueChange?.(event.target.value);
            }}
            id={inputId}
            aria-invalid={fieldState.invalid}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

interface SelectFieldProps<T extends FieldValues> extends FieldBaseProps<T> {
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}

// Usa NativeSelect (un <select> con estilo) en vez del Select de Base UI: es más simple,
// accesible y se comporta igual en el celular.
export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  options,
  disabled,
}: SelectFieldProps<T>) {
  const selectId = `${useId()}-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={selectId}>{label}</FieldLabel>
          <NativeSelect
            {...field}
            value={(field.value as string | undefined) ?? ""}
            id={selectId}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
          >
            {options.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
