"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

const PRODUCTION_URL = "https://df-store-py-dfstore.vercel.app";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace("/admin");
          router.refresh();
        }
      } catch {
        // The form remains available even if session lookup fails.
      }
    };
    checkSession();
  }, [router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      router.replace("/admin");
      router.refresh();
    } catch (error: any) {
      setMsg("❌ " + (error?.message || "Correo o contraseña incorrectos."));
    } finally {
      setBusy(false);
    }
  }

  async function sendRecovery(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${PRODUCTION_URL}/admin/reset-password`,
        }
      );
      if (error) throw error;
      setMsg("✅ Te enviamos un enlace para crear una nueva contraseña. Revisá tu correo y también la carpeta de spam.");
    } catch (error: any) {
      setMsg("❌ " + (error?.message || "No se pudo enviar el enlace de recuperación."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-login-page">
      <small>DF STORE PY</small>
      <h1>Acceso administrador</h1>

      {mode === "login" ? (
        <>
          <p className="muted">Ingresá con tu correo y contraseña de administrador.</p>
          <form onSubmit={signIn} className="product-form admin-login-form">
            <label>
              Correo administrador
              <input
                required
                autoComplete="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@ejemplo.com"
              />
            </label>
            <label>
              Contraseña
              <input
                required
                minLength={6}
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
              />
            </label>
            <button className="btn" disabled={busy}>
              {busy ? "Ingresando..." : "Ingresar al administrador"}
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setMode("forgot");
                setMsg("");
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
            {msg && <p role="status">{msg}</p>}
          </form>
        </>
      ) : (
        <>
          <p className="muted">Escribí tu correo y te enviaremos un enlace seguro para crear una nueva contraseña.</p>
          <form onSubmit={sendRecovery} className="product-form admin-login-form">
            <label>
              Correo administrador
              <input
                required
                autoComplete="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@ejemplo.com"
              />
            </label>
            <button className="btn" disabled={busy}>
              {busy ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setMode("login");
                setMsg("");
              }}
            >
              Volver al inicio de sesión
            </button>
            {msg && <p role="status">{msg}</p>}
          </form>
        </>
      )}
    </section>
  );
}
