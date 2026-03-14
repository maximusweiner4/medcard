import { Router } from 'express';
import { searchDrugs, getDrugDetails, getNdcs, getDrugProducts } from '../services/rxnorm.service';
import { getPillImages, getPrimaryPillImage } from '../services/rximage.service';
import { getPillAppearance } from '../services/dailymed.service';

const router = Router();

/** GET /api/drugs/search?term= — fuzzy drug name search via RxNorm */
router.get('/search', async (req, res, next) => {
  try {
    const term = String(req.query.term || '').trim();
    if (!term) { res.status(400).json({ error: 'term is required' }); return; }
    const results = await searchDrugs(term);
    res.json(results);
  } catch (err) { next(err); }
});

/** GET /api/drugs/:rxcui — drug details from RxNorm */
router.get('/:rxcui', async (req, res, next) => {
  try {
    const details = await getDrugDetails(req.params.rxcui);
    if (!details) { res.status(404).json({ error: 'Drug not found' }); return; }
    res.json(details);
  } catch (err) { next(err); }
});

/** GET /api/drugs/:rxcui/image — primary pill image URL */
router.get('/:rxcui/image', async (req, res, next) => {
  try {
    const images = await getPillImages(req.params.rxcui);
    res.json({ images, primary: images[0]?.imageUrl ?? null });
  } catch (err) { next(err); }
});

/** GET /api/drugs/:rxcui/appearance — pill color/shape/imprint via DailyMed */
router.get('/:rxcui/appearance', async (req, res, next) => {
  try {
    const ndcs = await getNdcs(req.params.rxcui);
    if (!ndcs.length) { res.json(null); return; }
    const appearance = await getPillAppearance(ndcs[0]);
    res.json(appearance);
  } catch (err) { next(err); }
});

/** GET /api/drugs/:rxcui/products — dose form options */
router.get('/:rxcui/products', async (req, res, next) => {
  try {
    const details = await getDrugDetails(req.params.rxcui);
    if (!details) { res.status(404).json({ error: 'Drug not found' }); return; }
    const products = await getDrugProducts(details.name);
    res.json(products);
  } catch (err) { next(err); }
});

export default router;
