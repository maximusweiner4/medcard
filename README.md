# MedCard

Medication list management app for family caregivers.

## Setup

### 1. Supabase

1. Go to https://supabase.com → New Project
2. Copy your **Project URL**, **Anon Key**, and **Service Role Key**
3. Enable Email auth: Authentication → Providers → Email → Enable
4. Create storage bucket: Storage → New bucket → `bottle-photos` → Public

### 2. Server

```bash
cd server
# Fill in .env with your Supabase credentials and PostgreSQL URL
# Use Supabase's PostgreSQL URL from: Project Settings → Database → URI
npm install
npx prisma db push
npm run dev       # runs on http://localhost:3000
```

### 3. Mobile

```bash
cd mobile
# Fill in .env with Supabase URL/key and your machine's local IP
# Replace YOUR_LOCAL_IP with: ipconfig → IPv4 Address
npm install
npx expo start    # scan QR code with Expo Go app on your phone
```

## Database URL (Supabase)

From Supabase dashboard: Project Settings → Database → Connection string → URI

```
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
```

## API Endpoints

- `GET  /api/drugs/search?term=`     — RxNorm fuzzy drug search
- `GET  /api/drugs/:rxcui/image`     — Pill image from RxIMAGE
- `POST /api/patients`               — Create patient profile
- `POST /api/patients/:id/medications` — Add medication
- `GET  /share/:token`               — Read-only web view (no auth)

## Project Structure

```
medcard/
├── server/          Express API + EJS share view
│   ├── prisma/      Database schema
│   ├── src/
│   │   ├── routes/
│   │   ├── services/    rxnorm, rximage, dailymed, ocr stub, share
│   │   └── middleware/  Supabase JWT auth
│   └── views/share.ejs  Read-only medication list page
└── mobile/          Expo React Native app
    ├── app/         Expo Router screens
    └── src/
        ├── stores/  Zustand state (auth, patient, medication)
        └── services/ API client + RxNorm direct calls
```
