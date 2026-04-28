"use client";

/**
 * Formulario completo de perfil. Reutilizado en:
 *   - /panel/onboarding (alta inicial del cliente)
 *   - /admin/clientes/nuevo (alta desde admin)
 *   - /admin/clientes/[id] (edicion desde admin)
 *   - /panel/datos (edicion desde cliente; en este caso DNI/IBAN se editan
 *     mediante un formulario separado con confirmacion email)
 */
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { provinciaFromCP } from "@/lib/provincias";
import { PROVINCIAS_LIST } from "@/lib/provincias";
import {
  ESTADOS_CIVILES,
  FORMAS_JURIDICAS,
  SITUACIONES_LABORALES,
  TIPOS_CLIENTE,
} from "@/db/schema";
import type { ActionResult } from "@/actions/auth";

interface Props {
  /** Valores iniciales (alta = vacio; edicion = perfil descifrado). */
  initial?: Partial<Record<string, string>>;
  /** Si true, oculta DNI/IBAN (los edita el cliente con flujo separado). */
  hideSensitive?: boolean;
  /** Texto del boton submit. */
  submitLabel: string;
  /** Server Action que recibe el FormData. */
  onSubmit: (fd: FormData) => Promise<ActionResult>;
  /** Mensaje de exito tras submit OK. */
  successMessage: string;
  /** Hidden inputs adicionales (e.g. userId en edicion admin). */
  extraHidden?: Record<string, string>;
}

export function ProfileForm({
  initial = {},
  hideSensitive = false,
  submitLabel,
  onSubmit,
  successMessage,
  extraHidden = {},
}: Props) {
  const [tipoCliente, setTipoCliente] = useState(initial.tipoCliente ?? "PARTICULAR");
  const [provincia, setProvincia] = useState(initial.provincia ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  function onCpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cp = e.target.value;
    if (/^\d{5}$/.test(cp)) {
      const auto = provinciaFromCP(cp);
      if (auto) setProvincia(auto);
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    for (const [k, v] of Object.entries(extraHidden)) fd.set(k, v);
    startTransition(async () => {
      const res = await onSubmit(fd);
      if (res.ok) {
        setDone(true);
        return;
      }
      setError(res.message);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
    });
  }

  if (done) {
    return (
      <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">{successMessage}</p>
    );
  }

  const fieldErr = (name: string) => fieldErrors[name]?.[0];

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-muted-foreground">Datos personales</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre" name="nombre" defaultValue={initial.nombre} error={fieldErr("nombre")} required />
          <Field label="Apellidos" name="apellidos" defaultValue={initial.apellidos} error={fieldErr("apellidos")} required />
          {!hideSensitive ? (
            <Field
              label="DNI / NIE"
              name="dni"
              defaultValue={initial.dni}
              error={fieldErr("dni")}
              required
              autoComplete="off"
              placeholder="12345678Z"
              uppercase
            />
          ) : null}
          <Field
            label="Telefono"
            name="telefono"
            type="tel"
            defaultValue={initial.telefono}
            error={fieldErr("telefono")}
            required
            placeholder="+34600000000"
          />
          <Field
            label="Fecha de nacimiento"
            name="fechaNacimiento"
            type="date"
            defaultValue={initial.fechaNacimiento}
            error={fieldErr("fechaNacimiento")}
            required
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-muted-foreground">Direccion</legend>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Field label="Calle" name="calle" defaultValue={initial.calle} error={fieldErr("calle")} required />
          </div>
          <Field label="Numero" name="numero" defaultValue={initial.numero} error={fieldErr("numero")} required />
          <Field label="Piso / puerta" name="piso" defaultValue={initial.piso} error={fieldErr("piso")} />
          <Field
            label="Codigo postal"
            name="codigoPostal"
            defaultValue={initial.codigoPostal}
            onChange={onCpChange}
            error={fieldErr("codigoPostal")}
            required
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
          />
          <Field label="Ciudad" name="ciudad" defaultValue={initial.ciudad} error={fieldErr("ciudad")} required />
          <div className="space-y-2">
            <Label htmlFor="provincia">Provincia</Label>
            <Select
              id="provincia"
              name="provincia"
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              required
            >
              <option value="">Selecciona...</option>
              {PROVINCIAS_LIST.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            {fieldErr("provincia") ? (
              <p className="text-xs text-destructive">{fieldErr("provincia")}</p>
            ) : null}
          </div>
          <input type="hidden" name="pais" value="ES" />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-muted-foreground">
          Datos opcionales
        </legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="estadoCivil">Estado civil</Label>
            <Select id="estadoCivil" name="estadoCivil" defaultValue={initial.estadoCivil ?? ""}>
              <option value="">--</option>
              {ESTADOS_CIVILES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <Field label="Profesion" name="profesion" defaultValue={initial.profesion} />
          <div className="space-y-2">
            <Label htmlFor="situacionLaboral">Situacion laboral</Label>
            <Select
              id="situacionLaboral"
              name="situacionLaboral"
              defaultValue={initial.situacionLaboral ?? ""}
            >
              <option value="">--</option>
              {SITUACIONES_LABORALES.map((s) => (
                <option key={s} value={s}>
                  {s.toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <Field
            label="Numero Seguridad Social"
            name="nss"
            defaultValue={initial.nss}
            placeholder="12 digitos"
            inputMode="numeric"
            error={fieldErr("nss")}
          />
          {!hideSensitive ? (
            <Field
              label="IBAN"
              name="iban"
              defaultValue={initial.iban}
              error={fieldErr("iban")}
              uppercase
              placeholder="ES00 0000 0000 0000 0000 0000"
            />
          ) : null}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-muted-foreground">Tipo de cliente</legend>
        <div className="space-y-2">
          <Label htmlFor="tipoCliente">Soy</Label>
          <Select
            id="tipoCliente"
            name="tipoCliente"
            value={tipoCliente}
            onChange={(e) => setTipoCliente(e.target.value)}
          >
            {TIPOS_CLIENTE.map((t) => (
              <option key={t} value={t}>
                {t.toLowerCase()}
              </option>
            ))}
          </Select>
        </div>
        {tipoCliente === "SOCIEDAD" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="CIF"
              name="cif"
              defaultValue={initial.cif}
              error={fieldErr("cif")}
              uppercase
              required
            />
            <Field
              label="Razon social"
              name="razonSocial"
              defaultValue={initial.razonSocial}
              error={fieldErr("razonSocial")}
              required
            />
            <div className="space-y-2">
              <Label htmlFor="formaJuridica">Forma juridica</Label>
              <Select
                id="formaJuridica"
                name="formaJuridica"
                defaultValue={initial.formaJuridica ?? ""}
                required
              >
                <option value="">--</option>
                {FORMAS_JURIDICAS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
              {fieldErr("formaJuridica") ? (
                <p className="text-xs text-destructive">{fieldErr("formaJuridica")}</p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <Field
                label="Domicilio fiscal"
                name="domicilioFiscal"
                defaultValue={initial.domicilioFiscal}
                error={fieldErr("domicilioFiscal")}
                required
              />
            </div>
          </div>
        ) : null}
      </fieldset>

      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full md:w-auto">
        {isPending ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  uppercase?: boolean;
}

function Field({ label, name, error, uppercase, defaultValue, ...rest }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        style={uppercase ? { textTransform: "uppercase" } : undefined}
        {...rest}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
