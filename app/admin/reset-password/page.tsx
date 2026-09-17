"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          setReady(true);
        } else {
          setMsg("❌ El enlace de recuperación no es válido o ya venció. Solicitá uno nuevo desde el acceso administrador.");
        }
      } catch (error: any) {
        setMsg("❌ " + (error?.message || "No se pudo validar el enlace de recuperación."));
      }
    };
    checkRecoverySession();
  }, []);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (password.length < 6) {
      setMsg("❌ La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setMsg("❌ Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg("✅ Contraseña actualizada correctamente. Ya podés ingresar al administrador.");
      setTimeout(() => {
        router.replace("/admin/login");
        router.refresh();
      }, 1200);
    } catch (error: any) {
      setMsg("❌ " + (error?.message || "No se pudo actualizar la contraseña."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-login-page">
      <small>DF STORE PY</small>
      <h1>Nueva contraseña</h1>
      <p className="muted">Creá una contraseña nueva para recuperar el acceso al administrador.</p>

      {ready ? (
        <form onSubmit={updatePassword} className="product-form admin-login-form">
          <label>
            Nueva contraseña
            <input
              required
              minLength={6}
              autoComplete="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </label>
          <label>
            Repetir contraseña
            <input
              required
              minLength={6}
              autoComplete="new-password"
              type="password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="Repetí la contraseña"
            />
          </label>
          <button className="btn" disabled={busy}>
            {busy ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
          {msg && <p role="status">{msg}</p>}
        </form>
      ) : (
        <p role="status">{msg || "Validando enlace..."}</p>
      )}
    </section>
  );
}
