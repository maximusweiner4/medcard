import axios from 'axios';

const BASE = 'https://rxnav.nlm.nih.gov/REST';

export interface RxNormCandidate {
  rxcui: string;
  name: string;
  score: number;
}

export interface DrugDetails {
  rxcui: string;
  name: string;
  synonym?: string;
  tty?: string; // term type: SBD=branded, SCD=clinical, etc.
}

/** Fuzzy drug name search — handles misspellings */
export async function searchDrugs(term: string): Promise<RxNormCandidate[]> {
  const { data } = await axios.get(`${BASE}/approximateTerm.json`, {
    params: { term, maxEntries: 10 },
  });
  const candidates = data?.approximateGroup?.candidate ?? [];
  return candidates.map((c: any) => ({
    rxcui: c.rxcui,
    name: c.name,
    score: parseInt(c.score, 10),
  }));
}

/** Get detailed properties for an RxCUI */
export async function getDrugDetails(rxcui: string): Promise<DrugDetails | null> {
  const { data } = await axios.get(`${BASE}/rxcui/${rxcui}/properties.json`);
  const props = data?.properties;
  if (!props) return null;
  return { rxcui: props.rxcui, name: props.name, synonym: props.synonym, tty: props.tty };
}

/** Get NDC codes for a given RxCUI (used to look up pill appearance) */
export async function getNdcs(rxcui: string): Promise<string[]> {
  const { data } = await axios.get(`${BASE}/rxcui/${rxcui}/ndcs.json`);
  return data?.ndcGroup?.ndcList?.ndc ?? [];
}

/** Get dose form options for a given drug name */
export async function getDrugProducts(name: string): Promise<any[]> {
  const { data } = await axios.get(`${BASE}/drugs.json`, { params: { name } });
  const groups = data?.drugGroup?.conceptGroup ?? [];
  const products: any[] = [];
  for (const group of groups) {
    if (group.conceptProperties) {
      products.push(...group.conceptProperties.map((p: any) => ({
        rxcui: p.rxcui,
        name: p.name,
        tty: group.tty,
      })));
    }
  }
  return products;
}
