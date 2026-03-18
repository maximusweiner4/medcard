import axios from 'axios';

const BASE = 'https://rximage.nlm.nih.gov/api/rximage/1';

export interface PillImage {
  imageUrl: string;
  ndc11: string;
  rxcui: string;
  name: string;
}

/** Fetch pill images by RxCUI. Returns up to 5 images. */
export async function getPillImages(rxcui: string): Promise<PillImage[]> {
  try {
    const { data } = await axios.get(`${BASE}/rxnav`, { params: { rxcui }, timeout: 5000 });
    const images = data?.nlmRxImages ?? [];
    return images.slice(0, 5).map((img: any) => ({
      imageUrl: img.imageUrl,
      ndc11: img.ndc11,
      rxcui: img.rxcui,
      name: img.name,
    }));
  } catch {
    return [];
  }
}

/** Get the first/best pill image URL for a given RxCUI */
export async function getPrimaryPillImage(rxcui: string): Promise<string | null> {
  const images = await getPillImages(rxcui);
  return images[0]?.imageUrl ?? null;
}
