# Nasazení AI parseru (Edge Function `parse-vrtaky`)

Funkce drží Anthropic API klíč na serveru. Klíč NIKDY není v `admin.html` / prohlížeči.

## Varianta A — Supabase Dashboard (bez instalace nástrojů)
1. Supabase → projekt → **Edge Functions** → **Create a function** → název `parse-vrtaky`.
2. Vlož obsah `index.ts` (vedle tohoto souboru) a **Deploy**.
3. Edge Functions → **Secrets** (nebo Project Settings → Edge Functions) → přidej:
   - `ANTHROPIC_API_KEY` = `sk-ant-...` (povinné)
   - `PARSE_SECRET` = libovolný tajný řetězec (volitelné). Když ho nastavíš, vyplň stejnou hodnotu do
     `PARSE_SECRET` v `admin.html`.
4. Pokud funkce vyžaduje JWT a admin volání selže na 401, vypni ověření:
   Edge Functions → funkce → nastavení → **Verify JWT = off** (nebo deploy přes CLI s `--no-verify-jwt`).

## Varianta B — Supabase CLI
```bash
supabase login
supabase link --project-ref dsskekmjtdfasppwwmtd
supabase functions deploy parse-vrtaky --no-verify-jwt
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# volitelně:
supabase secrets set PARSE_SECRET=nejaky-tajny-retezec
```

## Test
V adminu → Vrtáky → Import z ceníku → nahraj CSV → do hledání napiš např. `korunka` →
**✨ Dořešit nerozpoznané přes AI**. Stav ukáže průběh; pak se objeví doplněné skupiny.

## Bezpečnost (co je už zabudované)
- **API klíč je jen na serveru** (Supabase secret), nikdy v `admin.html` / prohlížeči.
- **CORS zámek na doménu:** funkce ve výchozím stavu přijímá volání jen z `https://drozdanaradi.github.io`.
  Když změníš doménu, nastav secret `ALLOWED_ORIGIN` (nebo `*` pro libovolnou — nedoporučeno).
- **Strop dávky:** max 150 položek na jedno volání (omezuje náklady i zneužití).
- **Volitelný `PARSE_SECRET`:** měkká pojistka. Pozor — protože admin je veřejný, případný token by byl ve
  zdrojáku vidět, takže reálnou ochranou je hlavně CORS + strop + limit útraty níže.

## Doporučeno: limit útraty
Na [console.anthropic.com](https://console.anthropic.com) → Billing → Limits si nastav měsíční strop,
ať máš jistotu, že se účet nikdy nevyšplhá výš, než chceš.

## Pozn. k ceně
Hybrid posílá AI jen názvy, které parser nerozpozná (a jen z aktuálního filtru). Model `claude-opus-4-8`.
Účtuje se podle Anthropic API (input/output tokeny).
