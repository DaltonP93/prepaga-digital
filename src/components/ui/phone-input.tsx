import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  type CountryCode,
  countryFlag,
  getCountryOptions,
  getDefaultCountry,
  isValidPhone,
  parsePhone,
  toE164,
} from "@/lib/phone";

/**
 * Campo de teléfono con selector de país.
 *
 * Reemplaza al "+595" que estaba pintado fijo al lado del input, que era la
 * causa de origen del bug: un vendedor veía "+595", cargaba un número brasileño
 * sin código de país y quedaba guardado mutilado.
 *
 * Pensado para NO cambiarle el trabajo a nadie:
 *  - Paraguay viene preseleccionado; tipear "981234567" y salir del campo
 *    funciona exactamente como antes, sin abrir el selector.
 *  - Sigue aceptando lo que se venía tipeando: con 0 inicial, con espacios,
 *    con guiones o con +595 adelante.
 *  - Un número ambiguo NO bloquea el guardado: se marca con una advertencia y
 *    se guarda igual. Frenar un alta de venta por un teléfono raro sería peor
 *    que el bug que estamos arreglando.
 *
 * El valor que emite es SIEMPRE E.164 ('+595981234567') cuando se puede
 * determinar; si no, emite lo tipeado tal cual para no perder el dato.
 */
export interface PhoneInputProps {
  value?: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  defaultCountry?: CountryCode;
  disabled?: boolean;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
  /** Muestra la advertencia cuando el número no es válido para el país elegido. */
  showValidation?: boolean;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onChange,
      onBlur,
      defaultCountry,
      disabled,
      id,
      name,
      placeholder = "981234567",
      className,
      showValidation = true,
    },
    ref,
  ) => {
    const options = React.useMemo(() => getCountryOptions(), []);

    const [country, setCountry] = React.useState<CountryCode>(
      defaultCountry ?? getDefaultCountry(),
    );
    // Lo que se ve en el campo: la parte nacional, sin el código de país.
    const [national, setNational] = React.useState("");
    const [open, setOpen] = React.useState(false);
    // Evita pisar lo que el usuario está tipeando cuando el form re-renderiza.
    const dirty = React.useRef(false);

    // Al montar (o cuando el form carga un valor guardado) se interpreta el
    // valor legacy y se muestra ya normalizado, sin pedirle nada al usuario.
    React.useEffect(() => {
      if (dirty.current) return;

      if (!value) {
        setNational("");
        return;
      }

      const parsed = parsePhone(value, country);
      if (parsed.ok && parsed.national) {
        if (parsed.country) setCountry(parsed.country);
        setNational(parsed.national);
      } else {
        // Ambiguo: se muestra tal cual para que se pueda ver y corregir.
        setNational(String(value).replace(/^\+/, ""));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const emit = (nextNational: string, nextCountry: CountryCode) => {
      const trimmed = nextNational.trim();
      if (!trimmed) {
        onChange("");
        return;
      }
      // Si ya tiene pinta de internacional se respeta; si no, se interpreta
      // como número nacional del país elegido.
      const e164 = toE164(trimmed, nextCountry);
      onChange(e164 ?? trimmed);
    };

    const handleNationalChange = (raw: string) => {
      dirty.current = true;
      // Se permiten dígitos y los separadores que la gente suele tipear.
      const cleaned = raw.replace(/[^\d\s()+\-.]/g, "");
      setNational(cleaned);
      emit(cleaned, country);
    };

    const handleCountryChange = (next: CountryCode) => {
      dirty.current = true;
      setCountry(next);
      setOpen(false);
      emit(national, next);
    };

    const selected = options.find((o) => o.code === country);

    const showWarning =
      showValidation && !!national.trim() && !isValidPhone(value || national, country);

    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-label="Código de país"
                aria-expanded={open}
                disabled={disabled}
                className="h-11 shrink-0 gap-1 rounded-r-none border-r-0 px-2.5 font-normal"
              >
                <span className="text-base leading-none">{countryFlag(country)}</span>
                <span className="text-sm text-muted-foreground">
                  +{selected?.callingCode}
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command
                filter={(itemValue, search) =>
                  itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                }
              >
                <CommandInput placeholder="Buscar país..." />
                <CommandList>
                  <CommandEmpty>Sin resultados.</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option.code}
                        value={`${option.label} ${option.code} +${option.callingCode}`}
                        onSelect={() => handleCountryChange(option.code)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            option.code === country ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="mr-2">{countryFlag(option.code)}</span>
                        <span className="flex-1 truncate">{option.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          +{option.callingCode}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Input
            ref={ref}
            id={id}
            name={name}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            disabled={disabled}
            placeholder={placeholder}
            value={national}
            onChange={(e) => handleNationalChange(e.target.value)}
            onBlur={onBlur}
            className="rounded-l-none"
          />
        </div>

        {showWarning && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Revisá el número: no parece válido para {selected?.label}. Se va a
            guardar igual.
          </p>
        )}
      </div>
    );
  },
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
