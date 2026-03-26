import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const prospect = await req.json();

    const { error } = await supabase.from("prospects").upsert({
      id:               prospect.id,
      user_id:          prospect.user_id,
      sex:              prospect.sex              || "F",
      name:             prospect.name,
      contact:          prospect.contact          || "",
      source:           prospect.source           || "",
      statut:           prospect.statut           || "CLIENT",
      date:             prospect.date             || new Date().toISOString().split("T")[0],
      type:             prospect.type             || "",
      presence:         prospect.presence         || "",
      heure:            prospect.heure            || "",
      objectif:         prospect.objectif         || "",
      objection:        prospect.objection        || "",
      closing:          prospect.closing          || "OUI",
      offre:            prospect.offre            || "-",
      notes:            prospect.notes            || "",
      profile:          prospect.profile          || "",
      prix_reel:        prospect.prix_reel        ?? 0,
      note_bilan:       prospect.note_bilan       ?? 0,
      note_profil:      prospect.note_profil      ?? 0,
      bilan_validated:  prospect.bilan_validated  ?? false,
      age:              prospect.age              ?? null,
      sap_enabled:      prospect.sap_enabled      ?? false,
      group_type:       prospect.group_type       ?? null,
      group_id:         prospect.group_id         ?? null,
      is_group_leader:  prospect.is_group_leader  ?? false,
      montant:          prospect.montant          ?? null,
      paiement_mode:    prospect.paiement_mode    ?? 1,
      versements_recus: prospect.versements_recus ?? 0,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
