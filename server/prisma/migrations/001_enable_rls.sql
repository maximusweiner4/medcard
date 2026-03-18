-- Migration 001: Enable Row Level Security on all public tables
--
-- Context: This app accesses Supabase exclusively through the Express API using
-- SUPABASE_SERVICE_ROLE_KEY, which automatically bypasses RLS. Enabling RLS
-- without any permissive policies blocks all direct PostgREST access via the
-- anon/authenticated roles while leaving the Express server unaffected.
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

ALTER TABLE public."User"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Patient"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Medication"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MedicationChangeLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CaregiverPatient"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ShareLink"           ENABLE ROW LEVEL SECURITY;

-- Explicitly deny all direct access for the anon role (belt-and-suspenders).
-- The service_role key used by the Express server bypasses these policies entirely.

CREATE POLICY "deny_anon_user"                ON public."User"                FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_patient"             ON public."Patient"             FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_medication"          ON public."Medication"          FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_changelog"           ON public."MedicationChangeLog" FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_caregiver_patient"   ON public."CaregiverPatient"    FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_sharelink"           ON public."ShareLink"           FOR ALL TO anon USING (false);

CREATE POLICY "deny_authenticated_user"                ON public."User"                FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_authenticated_patient"             ON public."Patient"             FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_authenticated_medication"          ON public."Medication"          FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_authenticated_changelog"           ON public."MedicationChangeLog" FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_authenticated_caregiver_patient"   ON public."CaregiverPatient"    FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_authenticated_sharelink"           ON public."ShareLink"           FOR ALL TO authenticated USING (false);
