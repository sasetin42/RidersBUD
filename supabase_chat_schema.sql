-- Create messages table for real-time chat
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view messages for bookings they are part of
CREATE POLICY "Users can view messages for their bookings" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = messages.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.mechanic_id = auth.uid())
    )
  );

-- Users can insert messages for bookings they are part of
CREATE POLICY "Users can insert messages for their bookings" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = messages.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.mechanic_id = auth.uid())
    )
    AND auth.uid() = sender_id
  );
