-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('booking-images', 'booking-images', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES FOR AVATARS BUCKET
-- ============================================

-- Allow public read access to avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- STORAGE POLICIES FOR BOOKING-IMAGES BUCKET
-- ============================================

-- Allow booking participants to view images
CREATE POLICY "Booking images viewable by participants"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'booking-images' AND
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE id::text = (storage.foldername(name))[1]
    AND (customer_id = auth.uid() OR mechanic_id = auth.uid())
  )
);

-- Allow mechanics to upload booking images
CREATE POLICY "Mechanics can upload booking images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'booking-images' AND
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE id::text = (storage.foldername(name))[1]
    AND mechanic_id = auth.uid()
  )
);

-- Allow mechanics to update booking images
CREATE POLICY "Mechanics can update booking images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'booking-images' AND
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE id::text = (storage.foldername(name))[1]
    AND mechanic_id = auth.uid()
  )
);

-- Allow mechanics to delete booking images
CREATE POLICY "Mechanics can delete booking images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'booking-images' AND
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE id::text = (storage.foldername(name))[1]
    AND mechanic_id = auth.uid()
  )
);
