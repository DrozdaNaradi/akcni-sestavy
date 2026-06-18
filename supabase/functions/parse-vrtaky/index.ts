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

const SYSTEM = `Jsi expert na sortiment vrtáků a řezných nástrojů Milwaukee. Logicky uvažuj, k čemu každý artikl patří
(podle materiálu, typu uchycení, použití) a rozparsuj rozměry.

Pro KAŽDOU položku ze vstupu vrať jeden objekt:
- "i": pořadové číslo položky ze vstupu (stejné, jaké přišlo)
- "kategorie": zařaď artikl do NEJVHODNĚJŠÍ kategorie z tohoto seznamu (použij PŘESNĚ tento název).
  Pokud žádná nesedí, vytvoř rozumný vlastní název, ale preferuj tyto:
  • Sady vrtáků
  • SDS Plus
  • SDS Plus s odsáváním
  • SDS Max (vrtáky)
  • SDS MAX korunky do zdiva
  • Vrták do betonu Premium s dříkem
  • Příklepový vrták do betonu - válcová stopka
  • Vrták do betonu DIN 8039
  • Vrták do betonu válcová stopka
  • HEX Univerzální vrtáky
  • Univerzální vrták
  • RED HEX titanové vrtáky do kovu
  • RED HEX titanové vrtáky do kovu BULK
  • Vrtáky do kovu
  • Kombinované závitníky HSS-G
  • Diamantové jádrové korunky
  • Diamantové mokré vrtání HEX
  • Diamantové suché vrtání
  • Vrtáky na sklo a keramiku
  • Stupňovité vrtáky
  • Samořezné vrtáky HEX Dřevo
  • Spirálový vrták do dřeva HEX
  • Spirálové vrtáky do dřeva
  • SPEED FEED Vrtáky do dřeva
  • Forstner vrták
  • Vrták dřevo centrovací trn
  • Ploché frézovací vrtáky
  • SHOCKWAVE Hadovitý vrták
  • SWITCHBLADE Samořezné vrtáky
  • Kruhové pilky HCS
  • Kruhové pilky na nerez TCT
  • Kruhové pilky na kov
  • Sklíčidla
  • Příslušenství
- "prumer": průměr v mm jako číslo, nebo null
- "delka_prac": pracovní (užitná) délka v mm jako číslo, nebo null
- "delka_celk": celková délka v mm jako číslo, nebo null
- "baleni": počet kusů v balení jako celé číslo, nebo null (např. "- 10ks" => 10)

Rozměry – pravidla:
- Zkratky: M2 = dvoubřitý, MX4 = čtyřbřitý, RedHex = vrták do kovu, korunka dia = diamantová pro jádrové vrtání.
- "A x B x C" => A=průměr, B=pracovní délka, C=celková délka.
- "A x B/C" (lomítko, např. SDS-Max "16 x 800/940") => A=průměr, B=pracovní délka, C=celková délka.
- "A x B" => A=průměr, B=celková délka (pracovní neznámá => null).
- "Ø 6mm" / "6 mm" (jen jeden rozměr) => A=průměr, délky null.
- Desetinná čárka i tečka jsou platné (5,5 = 5.5).
- Když je u kruhové pilky / korunky jen jeden rozměr, je to průměr.
- Nejistou hodnotu nech null, nikdy nehádej.`;

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
      messages: [{ role: "user", content: `Polozky k rozpoznani (jedna na radek, cislo: nazev):\n${list}` }],
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
