"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("Validando enlace de recuperación...");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let finished = false;

    const acceptRecoverySession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setMsg("❌ No se pudo validar el enlace de recuperación.");
        return;
      }
      if (data.session) {
        finished = true;
        setReady(true);
        setMsg("");
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        finished = true;
        setReady(true);
        setMsg("");
      }
    });

    acceptRecoverySession();

    const timeout = window.setTimeout(() => {
      if (!finished) {
        setMsg("❌ El enlace de recuperación no es válido, ya venció o no está autorizado para este sitio. Solicitá uno nuevo desde el acceso administrador.");
      }
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (password.length < 8) {
      setMsg("❌ La contraseña debe tener al menos 8 caracteres.");
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
      await supabase.auth.signOut();
      setMsg("✅ Contraseña actualizada correctamente. Ya podés ingresar al administrador.");
      window.setTimeout(() => {
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
            <input required minLength={8} autoComplete="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </label>
          <label>
            Repetir contraseña
            <input required minLength={8} autoComplete="new-password" type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Repetí la contraseña" />
          </label>
          <button className="btn" disabled={busy}>{busy ? "Guardando..." : "Guardar nueva contraseña"}</button>
          {msg && <p role="status">{msg}</p>}
        </form>
      ) : (
        <p role="status">{msg}</p>
      )}
    </section>
  );
}
