-- RidersBUD Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Services Table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    estimated_time TEXT,
    image_url TEXT,
    category TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parts Table
CREATE TABLE IF NOT EXISTS parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    sales_price DECIMAL(10,2),
    image_urls TEXT[],
    category TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    stock INTEGER DEFAULT 0,
    brand TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mechanics Table
CREATE TABLE IF NOT EXISTS mechanics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    bio TEXT,
    rating DECIMAL(3,2) DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    specializations TEXT[],
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Active', 'Inactive', 'Pending')),
    is_online BOOLEAN DEFAULT false,
    image_url TEXT,
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    registration_date DATE DEFAULT CURRENT_DATE,
    birthday DATE,
    base_price DECIMAL(10,2),
    portfolio_images TEXT[],
    business_license_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    picture TEXT,
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    favorite_mechanic_ids UUID[],
    subscribed_mechanic_ids UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    plate_number TEXT NOT NULL,
    image_urls TEXT[],
    is_primary BOOLEAN DEFAULT false,
    vin TEXT,
    mileage INTEGER,
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, plate_number)
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    service_id UUID REFERENCES services(id),
    mechanic_id UUID REFERENCES mechanics(id),
    vehicle_id UUID REFERENCES vehicles(id),
    date DATE NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'Upcoming' CHECK (status IN (
        'Upcoming', 'Booking Confirmed', 'Mechanic Assigned', 
        'En Route', 'In Progress', 'Completed', 'Cancelled', 'Reschedule Requested'
    )),
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    notes TEXT,
    cancellation_reason TEXT,
    is_reviewed BOOLEAN DEFAULT false,
    is_paid BOOLEAN DEFAULT false,
    eta INTEGER,
    before_images TEXT[],
    after_images TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking Status History
CREATE TABLE IF NOT EXISTS booking_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT DEFAULT 'Processing' CHECK (status IN ('Processing', 'Shipped', 'Delivered', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    part_id UUID REFERENCES parts(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id),
    customer_name TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Banners Table
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    link TEXT,
    category TEXT CHECK (category IN ('Services', 'Store', 'Reminders', 'Booking')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    name TEXT PRIMARY KEY,
    is_editable BOOLEAN DEFAULT true,
    description TEXT,
    default_permissions JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT REFERENCES roles(name),
    permissions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    is_complete BOOLEAN DEFAULT false,
    priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')),
    completion_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payout Requests Table
CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mechanic_id UUID REFERENCES mechanics(id),
    mechanic_name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    request_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    process_date TIMESTAMPTZ,
    rejection_reason TEXT
);

-- FAQs Table
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rental Cars Table
CREATE TABLE IF NOT EXISTS rental_cars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    type TEXT CHECK (type IN ('Sedan', 'SUV', 'Van', 'Luxury')),
    price_per_day DECIMAL(10,2) NOT NULL,
    seats INTEGER NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rental Bookings Table
CREATE TABLE IF NOT EXISTS rental_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_id UUID REFERENCES rental_cars(id),
    customer_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mechanics_location ON mechanics(lat, lng);
CREATE INDEX IF NOT EXISTS idx_mechanics_status ON mechanics(status, is_online);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_mechanic ON bookings(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_status_history_booking ON booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_mechanic ON reviews(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, read);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
-- Apply updated_at trigger to tables
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parts_updated_at ON parts;
CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mechanics_updated_at ON mechanics;
CREATE TRIGGER update_mechanics_updated_at BEFORE UPDATE ON mechanics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update mechanic rating
CREATE OR REPLACE FUNCTION update_mechanic_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE mechanics
    SET 
        rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE mechanic_id = NEW.mechanic_id),
        reviews_count = (SELECT COUNT(*) FROM reviews WHERE mechanic_id = NEW.mechanic_id)
    WHERE id = NEW.mechanic_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mechanic_rating ON reviews;
CREATE TRIGGER trigger_update_mechanic_rating
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_mechanic_rating();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public read access for data that should be public
DROP POLICY IF EXISTS "Public can view services" ON services;
CREATE POLICY "Public can view services" ON services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view parts" ON parts;
CREATE POLICY "Public can view parts" ON parts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view banners" ON banners;
CREATE POLICY "Public can view banners" ON banners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view mechanics" ON mechanics;
CREATE POLICY "Public can view mechanics" ON mechanics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view faqs" ON faqs;
CREATE POLICY "Public can view faqs" ON faqs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view rental_cars" ON rental_cars;
CREATE POLICY "Public can view rental_cars" ON rental_cars FOR SELECT USING (true);

-- Customers policies (Custom Auth Support)
DROP POLICY IF EXISTS "Enable access to all users" ON customers;
CREATE POLICY "Enable access to all users" ON customers FOR ALL USING (true) WITH CHECK (true);

-- Mechanics policies
DROP POLICY IF EXISTS "Enable access to all mechanics" ON mechanics;
CREATE POLICY "Enable access to all mechanics" ON mechanics FOR ALL USING (true) WITH CHECK (true);

-- Bookings policies
DROP POLICY IF EXISTS "Enable access to all bookings" ON bookings;
CREATE POLICY "Enable access to all bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);

-- Notifications policies
DROP POLICY IF EXISTS "Enable access to all notifications" ON notifications;
CREATE POLICY "Enable access to all notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Vehicles policies
DROP POLICY IF EXISTS "Enable access to all vehicles" ON vehicles;
CREATE POLICY "Enable access to all vehicles" ON vehicles FOR ALL USING (true) WITH CHECK (true);

-- Reviews policies
DROP POLICY IF EXISTS "Public can view reviews" ON reviews;
CREATE POLICY "Public can view reviews" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Customers can create reviews" ON reviews;
CREATE POLICY "Customers can create reviews" ON reviews FOR INSERT WITH CHECK (true);

-- Settings policies
DROP POLICY IF EXISTS "Enable access to settings" ON settings;
CREATE POLICY "Enable access to settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- REALTIME PUBLICATIONS
-- ============================================================================

-- Enable realtime for ALL tables for complete live data synchronization
DO $$
DECLARE
  schema_tables TEXT[] := ARRAY['services', 'parts', 'mechanics', 'customers', 'vehicles', 'bookings', 'booking_status_history', 'orders', 'order_items', 'reviews', 'banners', 'settings', 'notifications', 'admin_users', 'roles', 'tasks', 'payout_requests', 'faqs', 'rental_cars', 'rental_bookings'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY schema_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Note: Run these in Supabase Dashboard > Storage
-- INSERT INTO storage.buckets (id, name, public) VALUES 
--     ('avatars', 'avatars', true),
--     ('vehicles', 'vehicles', true),
--     ('portfolios', 'portfolios', true),
--     ('bookings', 'bookings', true),
--     ('parts', 'parts', true),
--     ('banners', 'banners', true);

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================

-- Insert default app settings
INSERT INTO settings (key, value) VALUES 
    ('app_settings', '{
        "appName": "RidersBUD",
        "contactEmail": "support@ridersbud.com",
        "contactPhone": "1-800-RIDERSBUD",
        "googleMapsApiKey": "AIzaSyDk8M9aZVVeUDPPgd2R4TebXr3YOajbPRM"
    }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'RidersBUD database schema created successfully!';
END $$;
