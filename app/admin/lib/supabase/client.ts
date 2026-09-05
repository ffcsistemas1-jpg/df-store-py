import {createBrowserClient} from "@supabase/ssr";
export function createClient(){const u=process.env.NEXT_PUBLIC_SUPABASE_URL;const k=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!u||!k)throw new Error("Faltan las variables de Supabase en Vercel");return createBrowserClient(u,k)}
