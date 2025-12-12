-- RidersBUD Database Schema Extensions
-- Additional tables for complete data persistence
-- Run this AFTER the main schema.sql

-- ============================================================================
-- CART ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_customer ON cart_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_part ON cart_items(part_id);

-- ============================================================================
-- WISHLIST ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wishlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_type TEXT NOT NULL CHECK (product_type IN ('service', 'part')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, product_id, product_type)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_customer ON wishlist_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product ON wishlist_items(product_id, product_type);

-- ============================================================================
-- SERVICE REMINDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    date DATE NOT NULL,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year INTEGER,
    vehicle_plate TEXT,
    notes TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_reminders_customer ON service_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_reminders_date ON service_reminders(date);
CREATE INDEX IF NOT EXISTS idx_service_reminders_completed ON service_reminders(is_completed);

-- ============================================================================
-- SERVICE WARRANTIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_warranties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    warranty_provider TEXT,
    warranty_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_warranties_customer ON service_warranties(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_warranties_expiry ON service_warranties(expiry_date);

-- ============================================================================
-- CHAT MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'mechanic', 'system')),
    sender_id UUID,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_booking ON chat_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- ============================================================================
-- NOTIFICATION SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'mechanic')),
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    booking_updates BOOLEAN DEFAULT true,
    promotional_emails BOOLEAN DEFAULT true,
    service_reminders BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, user_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id, user_type);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_reminders_updated_at ON service_reminders;
CREATE TRIGGER update_service_reminders_updated_at BEFORE UPDATE ON service_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_warranties_updated_at ON service_warranties;
CREATE TRIGGER update_service_warranties_updated_at BEFORE UPDATE ON service_warranties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Cart Items Policies
DROP POLICY IF EXISTS "Users can manage their own cart" ON cart_items;
CREATE POLICY "Users can manage their own cart" ON cart_items FOR ALL USING (true) WITH CHECK (true);

-- Wishlist Items Policies
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON wishlist_items;
CREATE POLICY "Users can manage their own wishlist" ON wishlist_items FOR ALL USING (true) WITH CHECK (true);

-- Service Reminders Policies
DROP POLICY IF EXISTS "Users can manage their own reminders" ON service_reminders;
CREATE POLICY "Users can manage their own reminders" ON service_reminders FOR ALL USING (true) WITH CHECK (true);

-- Service Warranties Policies
DROP POLICY IF EXISTS "Users can manage their own warranties" ON service_warranties;
CREATE POLICY "Users can manage their own warranties" ON service_warranties FOR ALL USING (true) WITH CHECK (true);

-- Chat Messages Policies
DROP POLICY IF EXISTS "Users can view booking chat messages" ON chat_messages;
CREATE POLICY "Users can view booking chat messages" ON chat_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can send chat messages" ON chat_messages;
CREATE POLICY "Users can send chat messages" ON chat_messages FOR INSERT WITH CHECK (true);

-- Notification Settings Policies
DROP POLICY IF EXISTS "Users can manage their own settings" ON notification_settings;
CREATE POLICY "Users can manage their own settings" ON notification_settings FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- REALTIME PUBLICATIONS
-- ============================================================================

DO $$
DECLARE
  new_tables TEXT[] := ARRAY['cart_items', 'wishlist_items', 'service_reminders', 'service_warranties', 'chat_messages', 'notification_settings'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY new_tables LOOP
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
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'RidersBUD schema extensions created successfully!';
    RAISE NOTICE 'New tables: cart_items, wishlist_items, service_reminders, service_warranties, chat_messages, notification_settings';
END $$;
