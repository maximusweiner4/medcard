export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'CAREGIVER' | 'PATIENT';
}

export interface Patient {
  id: string;
  name: string;
  dateOfBirth?: string;
  allergies: string[];
  shareToken: string;
  medications?: Medication[];
  updatedAt: string;
  caregivers?: CaregiverRelation[];
}

export interface Medication {
  id: string;
  patientId: string;
  rxcui?: string;
  drugName: string;
  brandName?: string;
  dose?: string;
  form?: string;
  route?: string;
  frequency?: string;
  instructions?: string;
  prescriber?: string;
  indication?: string;
  pharmacy?: string;
  pillColor?: string;
  pillShape?: string;
  pillImprint?: string;
  pillImageUrl?: string;
  bottlePhotoUrl?: string;
  isActive: boolean;
  ndc?: string;
  nextRefillDate?: string;
  pillsRemaining?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RxNormCandidate {
  rxcui: string;
  name: string;
  score: number;
}

export interface DrugSearchResult {
  rxcui: string;
  name: string;
  score: number;
  pillImageUrl?: string;
}

export interface CaregiverRelation {
  id: string;
  caregiverId: string;
  permissionLevel: 'ADMIN' | 'VIEW_ONLY';
  relationship?: string;
  caregiver: { id: string; name: string; email: string };
}
