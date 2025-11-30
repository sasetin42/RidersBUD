-- Enable RLS on tables (if not already enabled)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for 'services' table

-- Allow public read access (anyone can view services)
DROP POLICY IF EXISTS "Public services are viewable by everyone" ON services;
CREATE POLICY "Public services are viewable by everyone" 
ON services FOR SELECT 
USING (true);

-- Allow authenticated users (admins/staff) to insert services
DROP POLICY IF EXISTS "Authenticated users can insert services" ON services;
CREATE POLICY "Authenticated users can insert services" 
ON services FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update services
DROP POLICY IF EXISTS "Authenticated users can update services" ON services;
CREATE POLICY "Authenticated users can update services" 
ON services FOR UPDATE 
TO authenticated 
USING (true);

-- Allow authenticated users to delete services
DROP POLICY IF EXISTS "Authenticated users can delete services" ON services;
CREATE POLICY "Authenticated users can delete services" 
ON services FOR DELETE 
TO authenticated 
USING (true);


-- Create policies for 'products' (parts) table

-- Allow public read access (anyone can view products)
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON products;
CREATE POLICY "Public products are viewable by everyone" 
ON products FOR SELECT 
USING (true);

-- Allow authenticated users to insert products
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
CREATE POLICY "Authenticated users can insert products" 
ON products FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update products
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
CREATE POLICY "Authenticated users can update products" 
ON products FOR UPDATE 
TO authenticated 
USING (true);

-- Allow authenticated users to delete products
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;
CREATE POLICY "Authenticated users can delete products" 
ON products FOR DELETE 
TO authenticated 
USING (true);
