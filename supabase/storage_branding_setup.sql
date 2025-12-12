-- ============================================================================
-- Supabase Storage Setup for Branding Assets
-- ============================================================================
-- This script creates the storage bucket and policies for logo management

-- Create the branding-assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'branding-assets',
    'branding-assets',
    true,  -- Public access for logos
    5242880,  -- 5MB file size limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Storage Policies
-- ============================================================================

-- Policy 1: Allow public read access to all branding assets
CREATE POLICY "Public can view branding assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding-assets');

-- Policy 2: Allow authenticated users to upload branding assets
CREATE POLICY "Authenticated users can upload branding assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'branding-assets' 
    AND auth.role() = 'authenticated'
);

-- Policy 3: Allow authenticated users to update branding assets
CREATE POLICY "Authenticated users can update branding assets"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'branding-assets' 
    AND auth.role() = 'authenticated'
);

-- Policy 4: Allow authenticated users to delete branding assets
CREATE POLICY "Authenticated users can delete branding assets"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'branding-assets' 
    AND auth.role() = 'authenticated'
);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'branding-assets';

-- Verify policies were created
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%branding%';

-- ============================================================================
-- Usage Instructions
-- ============================================================================
-- 
-- 1. Run this script in your Supabase SQL Editor
-- 2. Verify the bucket and policies were created using the verification queries
-- 3. Test upload functionality in the Admin Panel > System Configuration > Branding
-- 4. Uploaded logos will be accessible at:
--    https://[your-project].supabase.co/storage/v1/object/public/branding-assets/[filename]
--
-- ============================================================================
