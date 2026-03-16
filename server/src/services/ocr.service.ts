/**
 * OCR Service — V1 STUB
 *
 * V2 will use Google Cloud Vision API to extract text from pill bottle photos.
 * For now, all bottle photos are saved and associated with the medication,
 * but text extraction is not performed.
 *
 * Integration point: replace processBottlePhoto() with:
 *   const client = new vision.ImageAnnotatorClient();
 *   const [result] = await client.textDetection(imageUrl);
 *   const text = result.textAnnotations?.[0]?.description ?? '';
 *   // then parse: drug name, dose, frequency from extracted text
 */

export interface OcrResult {
  status: 'pending' | 'processed' | 'failed';
  rawText: string | null;
  parsedDrugName: string | null;
  parsedDose: string | null;
  parsedFrequency: string | null;
}

/** Stub: saves photo URL, returns pending status for manual caregiver confirmation */
export async function processBottlePhoto(photoUrl: string): Promise<OcrResult> {
  console.log('[OCR STUB] Bottle photo received — manual entry required. URL omitted from log.');
  return {
    status: 'pending',
    rawText: null,
    parsedDrugName: null,
    parsedDose: null,
    parsedFrequency: null,
  };
}
