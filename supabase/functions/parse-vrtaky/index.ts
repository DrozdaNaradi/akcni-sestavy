// ============================================================
// Supabase Edge Function: parse-vrtaky
// Bezpečně volá Claude API (klíč je SERVEROVÝ secret, nikdy v prohlížeči).
// Hybrid režim: admin posílá jen názvy, které parser nerozpoznal.
//
// Nasazení:
//   supabase functions deploy parse-vrtaky --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...      (povinné)
//   supabase secrets set PARSE_SECRET=nejaky-tajny-retezec (volitelné, soft gate)
// ============================================================

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const PARSE_SECRET = Deno.env.get("PARSE_SECRET") || "";
// Bezpečnost: funkci přijímá volání jen z tvé veřejné admin domény (lze přepsat secretem ALLOWED_ORIGIN).
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://drozdanaradi.github.io";
const MAX_ITEMS = 150;  // strop na jednu dávku → omezuje náklady i případné zneužití

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allow = (ALLOWED_ORIGIN === "*" || origin === ALLOWED_ORIGIN) ? (origin || ALLOWED_ORIGIN) : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-parse-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
const json = (o: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });

const SYSTEM = `Jsi parser produktových názvů nářadí Milwaukee (vrtáky, vrtací korunky, děrovky, sady apod.).
Pro KAŽDOU položku ze vstupu vrať jeden objekt s poli:
- "i": pořadové číslo položky ze vstupu (stejné, jaké přišlo)
- "kategorie": čistý, SJEDNOCENÝ název skupiny BEZ rozměrů a balení. Stejné typy = naprosto stejný řetězec.
  Příklady: "Vrták SDS-Plus M2", "Vrták MX4 SDS-Plus", "Vrták SDS-Max", "Diamantová vrtací korunka",
  "Vrták do kovu RedHex HSS-G", "Vrták do dlažby a obkladů", "Děrovka Hole Dozer".
- "prumer": průměr v mm jako číslo, nebo null
- "delka_prac": pracovní délka v mm jako číslo, nebo null
- "delka_celk": celková délka v mm jako číslo, nebo null
- "baleni": počet kusů v balení jako celé číslo, nebo null (např. "- 10ks" => 10)

Pravidla:
- Zkratky: M2 = dvoubřitý, MX4 = čtyřbřitý, korunka dia = diamantová korunka pro jádrové vrtání.
- U rozměru "A x B x C" je A=průměr, B=pracovní délka, C=celková délka.
- U "A x B" je A=průměr, B=celková délka (pracovní neznámá => null).
- Desetinná čárka i tečka jsou platné (5,5 = 5.5).
- Pokud položka NENÍ vrták/korunka/řezný nástroj s rozměry (např. adaptér, sada bez rozměrů, příslušenství),
  dej rozměry null a do "kategorie" napiš rozumný obecný název (např. "Sada vrtáků", "Příslušenství").`;

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, cors);

  try {
    if (PARSE_SECRET && req.headers.get("x-parse-secret") !== PARSE_SECRET)
      return json({ error: "unauthorized" }, 401, cors);
    if (!ANTHROPIC_API_KEY)
      return json({ error: "ANTHROPIC_API_KEY není nastavený (supabase secrets set)" }, 500, cors);

    const { items } = await req.json();
    if (!Array.isArray(items) || !items.length) return json({ results: [] }, 200, cors);
    if (items.length > MAX_ITEMS)
      return json({ error: `příliš mnoho položek na jednu dávku (max ${MAX_ITEMS})` }, 400, cors);

    const list = items.map((it: { nazev?: string }, i: number) => `${i}: ${it.nazev ?? ""}`).join("\n");

    const body = {
      model: "claude-opus-4-8",
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: `Polož­ky k rozpoznání (jedna na řádek, číslo: název):\n${list}` }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    i: { type: "integer" },
                    kategorie: { type: "string" },
                    prumer: { anyOf: [{ type: "number" }, { type: "null" }] },
                    delka_prac: { anyOf: [{ type: "number" }, { type: "null" }] },
                    delka_celk: { anyOf: [{ type: "number" }, { type: "null" }] },
                    baleni: { anyOf: [{ type: "integer" }, { type: "null" }] },
                  },
                  required: ["i", "kategorie", "prumer", "delka_prac", "delka_celk", "baleni"],
                  additionalProperties: false,
                },
              },
            },
            required: ["results"],
            additionalProperties: false,
          },
        },
      },
    };

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) return json({ error: `anthropic ${r.status}: ${await r.text()}` }, 502, cors);
    const data = await r.json();
    const text = (data.content || []).filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text).join("");
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = { results: [] }; }
    return json(parsed, 200, cors);
  } catch (e) {
    return json({ error: String(e) }, 500, cors);
  }
});
