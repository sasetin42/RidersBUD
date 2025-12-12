-- ============================================================================
-- Realtime Map System - Database Schema
-- ============================================================================
-- This script creates the necessary tables and configurations for the
-- realtime interactive map system with location tracking

-- ============================================================================
-- 1. Create mechanic_locations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS mechanic_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2), -- Location accuracy in meters
    heading DECIMAL(5, 2), -- Direction in degrees (0-360)
    speed DECIMAL(10, 2), -- Speed in meters per second
    is_online BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mechanic_id)
);

-- Add comment
COMMENT ON TABLE mechanic_locations IS 'Stores realtime location data for mechanics';

-- ============================================================================
-- 2. Add location fields to bookings table
-- ============================================================================

-- Add customer location fields
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS customer_location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS customer_location_address TEXT,
ADD COLUMN IF NOT EXISTS share_location_with_mechanic BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS mechanic_eta_minutes INTEGER,
ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10, 2);

-- ============================================================================
-- 3. Create indexes for performance
-- ============================================================================

-- Spatial index for mechanic locations
CREATE INDEX IF NOT EXISTS idx_mechanic_locations_coords 
ON mechanic_locations (latitude, longitude);

-- Index for online mechanics
CREATE INDEX IF NOT EXISTS idx_mechanic_locations_online 
ON mechanic_locations (is_online, last_updated) 
WHERE is_online = true;

-- Index for mechanic lookup
CREATE INDEX IF NOT EXISTS idx_mechanic_locations_mechanic_id 
ON mechanic_locations (mechanic_id);

-- Index for customer locations in bookings
CREATE INDEX IF NOT EXISTS idx_bookings_customer_location 
ON bookings (customer_location_lat, customer_location_lng)
WHERE customer_location_lat IS NOT NULL;

-- Index for active bookings with locations
CREATE INDEX IF NOT EXISTS idx_bookings_active_with_location 
ON bookings (status, mechanic_id, customer_location_lat)
WHERE status IN ('Pending', 'Confirmed', 'In Progress');

-- ============================================================================
-- 4. Create function to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for mechanic_locations
DROP TRIGGER IF EXISTS update_mechanic_locations_updated_at ON mechanic_locations;
CREATE TRIGGER update_mechanic_locations_updated_at
    BEFORE UPDATE ON mechanic_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE mechanic_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Mechanics can view and update their own location
CREATE POLICY "Mechanics can manage own location"
ON mechanic_locations
FOR ALL
USING (
    auth.uid()::text = mechanic_id::text
    OR auth.jwt() ->> 'role' = 'admin'
);

-- Policy: Customers can view online mechanic locations
CREATE POLICY "Customers can view online mechanics"
ON mechanic_locations
FOR SELECT
USING (is_online = true);

-- Policy: Admins can view all locations
CREATE POLICY "Admins can view all locations"
ON mechanic_locations
FOR SELECT
USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- 6. Enable Realtime for mechanic_locations
-- ============================================================================

-- Enable realtime replication
ALTER PUBLICATION supabase_realtime ADD TABLE mechanic_locations;

-- ============================================================================
-- 7. Create helper functions
-- ============================================================================

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in kilometers
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);
    
    a := sin(dLat/2) * sin(dLat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dLon/2) * sin(dLon/2);
    
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find nearby mechanics
CREATE OR REPLACE FUNCTION find_nearby_mechanics(
    customer_lat DECIMAL,
    customer_lng DECIMAL,
    radius_km DECIMAL DEFAULT 10
)
RETURNS TABLE (
    mechanic_id UUID,
    mechanic_name TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_km DECIMAL,
    is_online BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ml.mechanic_id,
        m.name,
        ml.latitude,
        ml.longitude,
        calculate_distance(customer_lat, customer_lng, ml.latitude, ml.longitude) as distance,
        ml.is_online
    FROM mechanic_locations ml
    JOIN mechanics m ON m.id = ml.mechanic_id
    WHERE ml.is_online = true
    AND calculate_distance(customer_lat, customer_lng, ml.latitude, ml.longitude) <= radius_km
    ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Create view for active bookings with locations
-- ============================================================================

CREATE OR REPLACE VIEW active_bookings_with_locations AS
SELECT 
    b.id as booking_id,
    b.customer_id,
    b.customer_name,
    b.mechanic_id,
    m.name as mechanic_name,
    b.status,
    b.customer_location_lat,
    b.customer_location_lng,
    b.customer_location_address,
    ml.latitude as mechanic_lat,
    ml.longitude as mechanic_lng,
    ml.is_online as mechanic_online,
    b.mechanic_eta_minutes,
    b.distance_km,
    b.date,
    b.time
FROM bookings b
LEFT JOIN mechanics m ON m.id = b.mechanic_id
LEFT JOIN mechanic_locations ml ON ml.mechanic_id = b.mechanic_id
WHERE b.status IN ('Pending', 'Confirmed', 'In Progress')
AND b.customer_location_lat IS NOT NULL;

-- ============================================================================
-- 9. Verification Queries
-- ============================================================================

-- Verify mechanic_locations table
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'mechanic_locations'
ORDER BY ordinal_position;

-- Verify indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'mechanic_locations';

-- Verify RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'mechanic_locations';

-- ============================================================================
-- 10. Sample Data (Optional - for testing)
-- ============================================================================

-- Insert sample mechanic location (replace with actual mechanic ID)
-- INSERT INTO mechanic_locations (mechanic_id, latitude, longitude, is_online)
-- VALUES ('your-mechanic-uuid', 14.5995, 120.9842, true)
-- ON CONFLICT (mechanic_id) DO UPDATE
-- SET latitude = EXCLUDED.latitude,
--     longitude = EXCLUDED.longitude,
--     is_online = EXCLUDED.is_online,
--     last_updated = NOW();

-- ============================================================================
-- Usage Instructions
-- ============================================================================
-- 
-- 1. Run this script in your Supabase SQL Editor
-- 2. Verify tables and indexes were created using verification queries
-- 3. Test the helper functions:
--    SELECT * FROM find_nearby_mechanics(14.5995, 120.9842, 10);
-- 4. Check realtime is enabled:
--    SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
--
-- ============================================================================
