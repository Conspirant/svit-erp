import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase, SUPABASE_URL } from "@/lib/supabase";

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || "svitadmin";
const database = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : supabase;

export const dynamic = "force-dynamic";

function isAdmin(request) {
  return request.headers.get("x-admin-key") === ADMIN_KEY;
}

export async function GET() {
  const { data, error } = await database
    .from("portal_announcements")
    .select("id, title, message, is_active, updated_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ announcement: null, error: error.message }, { status: 500 });
  return NextResponse.json({ announcement: data || null });
}

export async function PUT(request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

  const body = await request.json();
  const title = String(body.title || "Announcement").trim().slice(0, 120);
  const message = String(body.message || "").trim().slice(0, 5000);
  const isActive = body.is_active !== false;
  if (!message) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });

  const { data, error } = await database
    .from("portal_announcements")
    .upsert({ singleton_key: "portal", title, message, is_active: isActive, updated_at: new Date().toISOString() }, { onConflict: "singleton_key" })
    .select("id, title, message, is_active, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcement: data });
}

export async function DELETE(request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const { error } = await database.from("portal_announcements").update({ is_active: false }).eq("singleton_key", "portal");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
