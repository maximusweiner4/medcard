import axios from 'axios';

const BASE = 'https://dailymed.nlm.nih.gov/dailymed/services/v2';

export interface PillAppearance {
  color?: string;
  shape?: string;
  imprint?: string;
  size?: string;
}

/** Look up pill appearance by NDC code */
export async function getPillAppearance(ndc: string): Promise<PillAppearance | null> {
  try {
    const { data } = await axios.get(`${BASE}/spls.json`, { params: { ndc }, timeout: 5000 });
    const spls = data?.data ?? [];
    if (spls.length === 0) return null;

    // Fetch the full SPL detail for the first result
    const setId = spls[0].setid;
    const { data: detail } = await axios.get(`${BASE}/spls/${setId}.json`, { timeout: 5000 });
    const product = detail?.data?.products?.[0];
    if (!product) return null;

    return {
      color: product.DEA_SCHEDULE_CODE || undefined, // DailyMed nests appearance differently
      shape: product.shape,
      imprint: product.imprint_code,
      size: product.size,
    };
  } catch {
    return null;
  }
}

/** Search DailyMed by drug name */
export async function searchDailyMed(drugName: string): Promise<any[]> {
  try {
    const { data } = await axios.get(`${BASE}/spls.json`, {
      params: { drug_name: drugName, pagesize: 5 }, timeout: 5000,
    });
    return data?.data ?? [];
  } catch {
    return [];
  }
}
