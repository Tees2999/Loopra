import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

function getKey(name: string): string {
  try {
    const parsed = JSON.parse(Deno.env.get(name) || "{}");
    return parsed.default || "";
  } catch {
    return "";
  }
}

const PUBLISHABLE_KEY = getKey("SUPABASE_PUBLISHABLE_KEYS");
const SECRET_KEY = getKey("SUPABASE_SECRET_KEYS");
const BASE = Deno.env.get("OZON_BASE") || "https://api.ozonexpress.ma";
const CUSTOMER = Deno.env.get("OZON_CUSTOMER_ID") || "";
const KEY = Deno.env.get("OZON_API_KEY") || "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function first_(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== "object") return "";
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  for (const k of Object.keys(obj)) {
    if (obj[k] && typeof obj[k] === "object") {
      const v = first_(obj[k], keys);
      if (v !== "") return v;
    }
  }
  return "";
}

function normalize_(s: any) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function unwrap_(data: any): any[] {
  if (Array.isArray(data)) return data;
  for (const k of ["data", "cities", "CITIES", "results", "items"]) {
    if (Array.isArray(data?.[k])) return data[k];
    if (data?.[k] && typeof data[k] === "object") return Object.values(data[k]);
  }
  return [];
}

function multipart_(fields: Record<string, any>) {
  const boundary = "----LoopraOzon" + Date.now();
  let body = "";
  for (const [k, v] of Object.entries(fields)) {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="${k}"\r\n\r\n`;
    body += `${v == null ? "" : String(v)}\r\n`;
  }
  body += `--${boundary}--\r\n`;
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

async function ozonPost_(path: string, fields: Record<string, any>) {
  const m = multipart_(fields);
  const res = await fetch(
    `${BASE}/customers/${encodeURIComponent(CUSTOMER)}/${encodeURIComponent(KEY)}${path}`,
    {
      method: "POST",
      headers: { "Content-Type": m.contentType },
      body: m.body,
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Ozon HTTP ${res.status}: ${text.slice(0, 1000)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function ozonGet_(path: string) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`Ozon HTTP ${res.status}: ${text.slice(0, 1000)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function mapStatus_(s: any) {
  const x = normalize_(s);
  if (x.includes("livr") && !x.includes("en livr")) return "delivered";
  if (x.includes("refus")) return "refused";
  if (x.includes("retour")) return "returned";
  if (x.includes("en livraison") || x.includes("exped") || x.includes("ramass") || x.includes("cours")) return "shipped";
  if (x.includes("nouveau") || x.includes("confirm")) return "confirmed";
  if (x.includes("annul")) return "cancelled";
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, 405);

  try {
    if (!SUPABASE_URL || !PUBLISHABLE_KEY || !SECRET_KEY) {
      return json({ ok: false, error: "Supabase environment is not configured." }, 500);
    }
    if (!CUSTOMER || !KEY) {
      return json({ ok: false, error: "Ozon secrets non configurés." }, 500);
    }

    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "Authentification requise." }, 401);

    const userClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ ok: false, error: "Session invalide." }, 401);

    const db = createClient(SUPABASE_URL, SECRET_KEY);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "test");

    if (action === "test") {
      const data = await ozonGet_("/cities");
      return json({ ok: true, action, message: "Connexion Ozon opérationnelle.", cities: unwrap_(data).length });
    }

    if (action === "cities") {
      const data = await ozonGet_("/cities");
      const list = unwrap_(data);
      const rows: any[] = [];
      for (const item of list) {
        const id = first_(item, ["id", "city_id", "ID", "CITY_ID", "value"]);
        const name = first_(item, ["name", "city_name", "NAME", "CITY_NAME", "label", "label_fr"]);
        const delivery = first_(item, ["price", "delivery_price", "delivered_price", "DELIVERED-PRICE", "DELIVERY-PRICE", "tarif", "tariff"]);
        const returned = first_(item, ["return_price", "returned_price", "RETURNED-PRICE", "return_tariff"]);
        const refused = first_(item, ["refused_price", "REFUSED-PRICE", "refuse_price"]);
        if (id !== "" && name !== "") {
          rows.push({ id: String(id), name: String(name), raw_data: { delivery, returned, refused, source: "API /cities" }, updated_at: new Date().toISOString() });
        }
      }
      if (!rows.length) throw new Error("Aucune ville exploitable dans /cities.");
      const { error } = await db.from("ozon_cities").upsert(rows, { onConflict: "id" });
      if (error) throw error;
      return json({ ok: true, action, cities: rows.length });
    }

    if (action === "send_confirmed") {
      const { data: orders, error } = await db
        .from("orders")
        .select("*,clients(full_name,phone,city,address)")
        .eq("user_id", user.id)
        .in("status", ["confirmed", "processing"])
        .neq("ozon_sync_status", "sent")
        .order("created_at", { ascending: true });
      if (error) throw error;

      let sent = 0, errors = 0;
      const details: any[] = [];
      for (const o of (orders || [])) {
        try {
          const { data: items, error: ie } = await db.from("order_items").select("sku,product_name,quantity").eq("order_id", o.id);
          if (ie) throw ie;
          const cityName = o.city || o.clients?.city || "";
          const { data: cities } = await db.from("ozon_cities").select("id,name").limit(1000);
          const city = cities?.find((c: any) => normalize_(c.name) === normalize_(cityName));
          if (!city) throw new Error(`Ville Ozon introuvable: ${cityName}`);

          const fields = {
            "tracking-number": "",
            "parcel-receiver": o.clients?.full_name || o.reference,
            "parcel-phone": o.phone || o.clients?.phone || "",
            "parcel-city": city.id,
            "parcel-address": o.address || o.clients?.address || "",
            "parcel-note": o.comment || "",
            "parcel-price": o.total,
            "parcel-declared-value": Math.max(50, Number(o.total || 0)),
            "parcel-nature": items?.map((x: any) => x.product_name).join(", ") || "Colis",
            "parcel-stock": 0,
            "parcel-open": 1,
            "parcel-fragile": 0,
            "parcel-replace": 0,
            "products": JSON.stringify((items || []).map((x: any) => ({ ref: String(x.sku || ""), qnty: Number(x.quantity || 1) }))),
          };
          const data = await ozonPost_("/add-parcel", fields);
          const tracking = first_(data, ["TRACKING-NUMBER", "tracking-number", "tracking_number", "tracking"]);
          if (!tracking) throw new Error(`Ozon n'a pas renvoyé le tracking: ${JSON.stringify(data).slice(0, 800)}`);

          const { error: ue } = await db.from("orders").update({
            ozon_tracking: String(tracking), ozon_id: String(tracking), ozon_status: "Nouveau Colis", ozon_sync_status: "sent",
          }).eq("id", o.id).eq("user_id", user.id);
          if (ue) throw ue;
          sent++;
          details.push({ reference: o.reference, tracking: String(tracking), ok: true });
        } catch (e: any) {
          errors++;
          details.push({ reference: o.reference, error: e?.message || String(e), ok: false });
        }
      }
      return json({ ok: true, action, sent, errors, details });
    }

    if (action === "sync_all") {
      const { data: orders, error } = await db.from("orders")
        .select("id,reference,status,ozon_tracking,ozon_id")
        .eq("user_id", user.id)
        .neq("ozon_tracking", "")
        .order("updated_at", { ascending: true })
        .limit(200);
      if (error) throw error;

      let synced = 0, errors = 0;
      const details: any[] = [];
      for (const o of (orders || [])) {
        try {
          const tracking = String(o.ozon_tracking || o.ozon_id || "");
          if (!tracking) continue;
          let trackingData: any = {};
          try { trackingData = await ozonPost_("/tracking", { "tracking-number": tracking }); } catch { trackingData = {}; }
          const info = await ozonPost_("/parcel-info", { "tracking-number": tracking });
          const rawStatus = first_(trackingData, ["STATUT", "STATUS", "status", "STATE", "state", "PARCEL-STATUS", "parcel_status"]) || first_(info, ["STATUT", "STATUS", "status", "STATE", "state", "PARCEL-STATUS", "parcel_status"]);
          const mapped = mapStatus_(rawStatus);
          const delivered = first_(info, ["DELIVERED-PRICE", "delivered-price", "delivered_price"]);
          const returned = first_(info, ["RETURNED-PRICE", "returned-price", "returned_price"]);
          const refused = first_(info, ["REFUSED-PRICE", "refused-price", "refused_price"]);
          const patch: any = { ozon_status: String(rawStatus || ""), ozon_sync_status: "synced", updated_at: new Date().toISOString() };
          if (mapped) patch.status = mapped;
          if (delivered !== "") patch.ozon_delivery_cost = Number(delivered) || 0;
          if (returned !== "") patch.ozon_return_cost = Number(returned) || 0;
          if (refused !== "") patch.ozon_refusal_cost = Number(refused) || 0;
          const { error: ue } = await db.from("orders").update(patch).eq("id", o.id).eq("user_id", user.id);
          if (ue) throw ue;
          synced++;
          details.push({ reference: o.reference, status: rawStatus || "", mapped: mapped || null, ok: true });
        } catch (e: any) {
          errors++;
          details.push({ reference: o.reference, error: e?.message || String(e), ok: false });
        }
      }
      return json({ ok: true, action, synced, errors, details });
    }

    if (action === "sync_order") {
      const reference = String(body.reference || "");
      if (!reference) throw new Error("Référence commande manquante.");
      const { data: o, error } = await db.from("orders").select("id,reference,status,ozon_tracking,ozon_id").eq("user_id", user.id).eq("reference", reference).single();
      if (error || !o) throw new Error("Commande introuvable.");
      const tracking = String(o.ozon_tracking || o.ozon_id || "");
      if (!tracking) throw new Error("Cette commande n'a pas encore de tracking Ozon.");
      const info = await ozonPost_("/parcel-info", { "tracking-number": tracking });
      const rawStatus = first_(info, ["STATUT", "STATUS", "status", "STATE", "state", "PARCEL-STATUS", "parcel_status"]);
      const mapped = mapStatus_(rawStatus);
      const patch: any = { ozon_sync_status: "synced", updated_at: new Date().toISOString() };
      if (rawStatus) patch.ozon_status = String(rawStatus);
      if (mapped) patch.status = mapped;
      const delivered = first_(info, ["DELIVERED-PRICE", "delivered-price", "delivered_price"]);
      const returned = first_(info, ["RETURNED-PRICE", "returned-price", "returned_price"]);
      const refused = first_(info, ["REFUSED-PRICE", "refused-price", "refused_price"]);
      if (delivered !== "") patch.ozon_delivery_cost = Number(delivered) || 0;
      if (returned !== "") patch.ozon_return_cost = Number(returned) || 0;
      if (refused !== "") patch.ozon_refusal_cost = Number(refused) || 0;
      const { error: ue } = await db.from("orders").update(patch).eq("id", o.id).eq("user_id", user.id);
      if (ue) throw ue;
      return json({ ok: true, reference, status: rawStatus || "", mapped: mapped || null, tracking });
    }

    return json({ ok: false, error: `Action inconnue: ${action}` }, 400);
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
});
