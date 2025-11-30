-- Create Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    app_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    app_logo_url TEXT,
    admin_sidebar_logo_url TEXT,
    app_tagline TEXT,
    booking_start_time TEXT,
    booking_end_time TEXT,
    booking_slot_duration INTEGER,
    max_bookings_per_slot INTEGER,
    email_on_new_booking BOOLEAN,
    email_on_cancellation BOOLEAN,
    booking_buffer_time INTEGER,
    advance_booking_days INTEGER,
    cancellation_policy TEXT,
    virtual_mechanic_name TEXT,
    virtual_mechanic_image_url TEXT,
    virtual_mechanic_system_instruction TEXT,
    mechanic_marker_url TEXT,
    google_maps_api_key TEXT,
    service_categories TEXT[],
    part_categories TEXT[]
);

-- Enable RLS for settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies for settings
DROP POLICY IF EXISTS "Public settings are viewable by everyone" ON settings;
CREATE POLICY "Public settings are viewable by everyone" ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can update settings" ON settings;
CREATE POLICY "Authenticated users can update settings" ON settings FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert settings" ON settings;
CREATE POLICY "Authenticated users can insert settings" ON settings FOR INSERT TO authenticated WITH CHECK (true);

-- Insert default settings if empty
INSERT INTO settings (id, app_name, contact_email, service_categories, part_categories)
SELECT 1, 'RidersBUD', 'support@ridersbud.com', ARRAY['Maintenance', 'Repair', 'Inspection', 'Customization'], ARRAY['Engine', 'Tires', 'Brakes', 'Accessories']
WHERE NOT EXISTS (SELECT 1 FROM settings);


-- Create Roles Table
CREATE TABLE IF NOT EXISTS roles (
    name TEXT PRIMARY KEY,
    description TEXT,
    is_editable BOOLEAN DEFAULT true,
    default_permissions JSONB
);

-- Enable RLS for roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Policies for roles
DROP POLICY IF EXISTS "Public roles are viewable by everyone" ON roles;
CREATE POLICY "Public roles are viewable by everyone" ON roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert roles" ON roles;
CREATE POLICY "Authenticated users can insert roles" ON roles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update roles" ON roles;
CREATE POLICY "Authenticated users can update roles" ON roles FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete roles" ON roles;
CREATE POLICY "Authenticated users can delete roles" ON roles FOR DELETE TO authenticated USING (true);

-- Insert default roles
INSERT INTO roles (name, description, is_editable, default_permissions)
VALUES 
('Super Admin', 'Full access to all modules', false, '{"dashboard": "edit", "analytics": "edit", "bookings": "edit", "services": "edit", "mechanics": "edit", "customers": "edit", "marketing": "edit", "users": "edit", "settings": "edit"}'),
('Admin', 'Access to most modules', true, '{"dashboard": "edit", "bookings": "edit", "services": "edit", "mechanics": "edit", "customers": "edit"}'),
('Manager', 'Limited access', true, '{"dashboard": "view", "bookings": "edit", "mechanics": "view"}')
ON CONFLICT (name) DO NOTHING;


-- Create Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT UNIQUE,
    role TEXT REFERENCES roles(name),
    avatar TEXT,
    last_login TIMESTAMPTZ
);

-- Enable RLS for admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policies for admin_users
DROP POLICY IF EXISTS "Public admin_users are viewable by everyone" ON admin_users;
CREATE POLICY "Public admin_users are viewable by everyone" ON admin_users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert admin_users" ON admin_users;
CREATE POLICY "Authenticated users can insert admin_users" ON admin_users FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update admin_users" ON admin_users;
CREATE POLICY "Authenticated users can update admin_users" ON admin_users FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete admin_users" ON admin_users;
CREATE POLICY "Authenticated users can delete admin_users" ON admin_users FOR DELETE TO authenticated USING (true);
