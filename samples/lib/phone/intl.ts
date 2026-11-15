/**
 * Telefone INTERNACIONAL — o mínimo pra entender um número que não é brasileiro.
 *
 * REGRA ÚNICA, e ela é a razão de tudo isto ser seguro: só o "+" explícito marca
 * um número internacional. Número SEM "+" continua sendo lido como brasileiro,
 * exatamente como sempre foi — a base inteira (591 telefones em produção, ZERO
 * com "+") não muda de significado por causa deste arquivo.
 *
 * Por que NÃO dá pra adivinhar pelo tamanho: a base tem 15 números brasileiros
 * gravados com o zero de tronco ("048999990003", "011999990004", 12 dígitos) e
 * dezenas com o DDI 55 colado (13 dígitos). Uma regra do tipo "12+ dígitos é
 * estrangeiro" transformaria esses brasileiros reais em estrangeiros. Por isso a
 * marca é o "+", nunca o comprimento.
 *
 * Por que sem biblioteca: o que precisamos é separar DDI de número nacional, e
 * os códigos de país da ITU-T E.164 formam um código LIVRE DE PREFIXO (nenhum
 * código válido é prefixo de outro — "1" existe, "12"/"13" não; "55" existe,
 * "5" não). Com essa propriedade, casar do mais longo pro mais curto nunca erra.
 * Uma lib de telefone resolveria também o formato NACIONAL de cada país (coisa
 * que não precisamos: não formatamos o miolo estrangeiro) ao custo de ~150 KB.
 *
 * Custo de errar:
 *   - DDI desconhecido → devolve null → o produto NÃO envia (cai pro e-mail ou
 *     avisa que não tem canal). Atrapalha, mas não manda pra ninguém errado.
 *   - DDI partido errado → mandaria pro número de um estranho. A lista ser livre
 *     de prefixo impede UM caso: um código inválido casar por engano com um
 *     válido mais curto ("+999…" não vira Rússia "+9…", porque "9" não é código
 *     de país). NÃO impede o outro: quem escrever um DDD brasileiro depois do
 *     "+" ("+47 99999-0000", DDD de Joinville) declarou a Noruega e é isso que
 *     vai ser lido. Não dá pra desfazer sem adivinhar — o que a tela faz é
 *     denunciar: o número aparece "+47 999990000", nunca "(47) 99999-0000".
 * O teste em lib/phone/phone.test.ts trava essas propriedades contra edição
 * futura.
 *
 * Por que "00" NÃO é aceito como prefixo internacional: no Brasil disca-se
 * internacional com 00 + CÓDIGO DA OPERADORA (2 dígitos) + DDI — "0021 1 404…"
 * pela Embratel. Ler o "00" como "+" transformaria a operadora 21 no DDI 211
 * (Sudão do Sul) e entregaria a mensagem a um estranho. Fica de fora de
 * propósito: "00…" continua caindo na régua brasileira, como sempre caiu.
 */

/**
 * Códigos de país E.164 (ITU-T). Só códigos GEOGRÁFICOS de topo — os territórios
 * do plano norte-americano (Guam, Samoa Americana, Bahamas…) entram no "1", que
 * é o código de verdade; listá-los como "1671" quebraria a propriedade de
 * prefixo livre e não mudaria o resultado.
 *
 * Redes não-geográficas (800 freefone internacional, 870/878 satélite, 881-888)
 * ficam DE FORA: não são destino de WhatsApp e a ausência falha do lado seguro.
 */
export const E164_COUNTRY_CODES: ReadonlySet<string> = new Set([
  // Zona 1 — Plano de Numeração Norte-Americano (EUA, Canadá e Caribe)
  "1",
  // Zona 2 — África
  "20", "211", "212", "213", "216", "218", "220", "221", "222", "223", "224",
  "225", "226", "227", "228", "229", "230", "231", "232", "233", "234", "235",
  "236", "237", "238", "239", "240", "241", "242", "243", "244", "245", "246",
  "247", "248", "249", "250", "251", "252", "253", "254", "255", "256", "257",
  "258", "260", "261", "262", "263", "264", "265", "266", "267", "268", "269",
  "27", "290", "291", "297", "298", "299",
  // Zonas 3 e 4 — Europa
  "30", "31", "32", "33", "34", "350", "351", "352", "353", "354", "355", "356",
  "357", "358", "359", "36", "370", "371", "372", "373", "374", "375", "376",
  "377", "378", "379", "380", "381", "382", "383", "385", "386", "387", "389",
  "39", "40", "41", "420", "421", "423", "43", "44", "45", "46", "47", "48", "49",
  // Zona 5 — América Latina e Caribe
  "500", "501", "502", "503", "504", "505", "506", "507", "508", "509", "51",
  "52", "53", "54", "55", "56", "57", "58", "590", "591", "592", "593", "594",
  "595", "596", "597", "598", "599",
  // Zona 6 — Sudeste Asiático e Oceania
  "60", "61", "62", "63", "64", "65", "66", "670", "672", "673", "674", "675",
  "676", "677", "678", "679", "680", "681", "682", "683", "685", "686", "687",
  "688", "689", "690", "691", "692",
  // Zona 7 — Rússia e Cazaquistão
  "7",
  // Zona 8 — Ásia Oriental
  "81", "82", "84", "86", "850", "852", "853", "855", "856", "880", "886",
  // Zona 9 — Ásia Central, Sul e Oriente Médio
  "90", "91", "92", "93", "94", "95", "960", "961", "962", "963", "964", "965",
  "966", "967", "968", "970", "971", "972", "973", "974", "975", "976", "977",
  "98", "992", "993", "994", "995", "996", "998",
]);

/** Número internacional já separado em DDI + parte nacional (só dígitos). */
export type IntlPhone = {
  /** Código do país, sem "+" (ex.: "1", "55", "351"). */
  country: string;
  /** O resto do número, só dígitos (ex.: "4045550100"). */
  national: string;
};

/**
 * O texto se declara internacional? É só isto: tem um "+" ANTES do primeiro
 * dígito.
 *
 * Não é `startsWith("+")` — e a diferença é o caso mais provável de todos.
 * Copiar um telefone do cartão de contato do WhatsApp/iOS traz junto marcas
 * invisíveis de direção de texto (U+200E LRM, U+202A, U+200B ZWSP), então o
 * que chega no campo é "‎+1 404 555-0100". `trimStart()` remove espaço e
 * NBSP, mas NÃO remove essas marcas: o "+" deixava de ser reconhecido, o
 * número virava "(14) 04555-0100" e a mensagem ia pra um brasileiro
 * inexistente — o bug original, de volta, e desta vez invisível.
 *
 * Ler "antes do primeiro dígito" é seguro pra base inteira: nenhum dos 592
 * telefones gravados tem "+" em lugar nenhum (medido), e um número brasileiro
 * mascarado — "(47) 99999-0000" — não tem "+" antes do "4".
 */
export function hasIntlPrefix(value: string | null | undefined): boolean {
  return /^[^\d+]*\+/.test(value ?? "");
}

/**
 * "+1 404 555-0100" → { country: "1", national: "4045550100" }.
 *
 * Devolve null quando o valor NÃO se declara internacional (aí é brasileiro, e
 * quem resolve é a régua BR de sempre) ou quando o DDI não está na lista —
 * nesse caso o produto prefere não enviar a enviar pro desconhecido.
 *
 * Casa do mais longo pro mais curto (3 → 2 → 1). Como a lista é livre de
 * prefixo, a ordem é indiferente pro resultado; é só a leitura natural.
 */
export function parseIntlPhone(
  value: string | null | undefined,
): IntlPhone | null {
  if (!hasIntlPrefix(value)) return null;
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  for (const len of [3, 2, 1]) {
    if (digits.length <= len) continue;
    const candidate = digits.slice(0, len);
    if (E164_COUNTRY_CODES.has(candidate)) {
      return { country: candidate, national: digits.slice(len) };
    }
  }
  return null;
}
