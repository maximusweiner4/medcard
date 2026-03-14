import axios from 'axios';

const BASE = 'https://rxnav.nlm.nih.gov/REST';

/** Direct NLM call — no auth needed, called from mobile for real-time search */
export async function searchRxNorm(term: string) {
  const { data } = await axios.get(`${BASE}/approximateTerm.json`, {
    params: { term, maxEntries: 10 },
  });
  return (data?.approximateGroup?.candidate ?? []).map((c: any) => ({
    rxcui: c.rxcui,
    name: c.name,
    score: parseInt(c.score, 10),
  }));
}

export async function getPillImage(rxcui: string): Promise<string | null> {
  try {
    const { data } = await axios.get(
      `https://rximage.nlm.nih.gov/api/rximage/1/rxnav?rxcui=${rxcui}`
    );
    return data?.nlmRxImages?.[0]?.imageUrl ?? null;
  } catch {
    return null;
  }
}
