-- ================================================================
-- Database Schema for "ماركت طيبة" (Tayba Market) WhatsApp Catalog
-- ================================================================

-- 1. Create categories table (أقسام المتجر)
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create products table (المنتجات)
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) CHECK (price >= 0),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_hidden BOOLEAN DEFAULT FALSE NOT NULL,
    inventory_stock INTEGER DEFAULT NULL, -- NULL means stock is not tracked
    has_offer BOOLEAN DEFAULT FALSE NOT NULL,
    offer_title TEXT DEFAULT NULL,
    offer_type TEXT DEFAULT 'unlimited' CHECK (offer_type IN ('unlimited', 'date_limited', 'stock_limited')),
    offer_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    offer_max_quantity INTEGER DEFAULT NULL,
    offer_used_quantity INTEGER DEFAULT 0 NOT NULL,
    note TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create daily_offers table (بوسترات وبانرات العروض اليومية)
CREATE TABLE IF NOT EXISTS daily_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    link_url TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create customers table (دليل الزبائن)
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    phone TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create orders table (الطلبيات والفواتير)
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT DEFAULT NULL,
    customer_address TEXT DEFAULT NULL,
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'postponed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create order_items table (بنود الطلبات)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase DECIMAL(10, 2) CHECK (price_at_purchase >= 0),
    product_name TEXT DEFAULT NULL,
    product_image TEXT DEFAULT NULL,
    applied_offer TEXT DEFAULT NULL
);

-- 7. Create settings table (إعدادات المتجر ورقم الواتساب)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Seed default settings
INSERT INTO settings (key, value) 
VALUES 
    ('whatsapp_number', '905000000000'),
    ('store_name', 'ماركت طيبة'),
    ('store_address', 'الماركت المركزي'),
    ('store_note', 'أهلاً بكم في ماركت طيبة - جودة وتوفير كل يوم')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------
-- Row Level Security (RLS) Policies
-- ----------------------------------------------------

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Categories Policies
DROP POLICY IF EXISTS "Allow public read categories" ON categories;
CREATE POLICY "Allow public read categories" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin all categories" ON categories;
CREATE POLICY "Allow admin all categories" ON categories FOR ALL TO authenticated USING (true);

-- Products Policies
DROP POLICY IF EXISTS "Allow public read products" ON products;
CREATE POLICY "Allow public read products" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin all products" ON products;
CREATE POLICY "Allow admin all products" ON products FOR ALL TO authenticated USING (true);

-- Daily Offers Policies
DROP POLICY IF EXISTS "Allow public read daily_offers" ON daily_offers;
CREATE POLICY "Allow public read daily_offers" ON daily_offers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin all daily_offers" ON daily_offers;
CREATE POLICY "Allow admin all daily_offers" ON daily_offers FOR ALL TO authenticated USING (true);

-- Customers Policies
DROP POLICY IF EXISTS "Allow public read customers" ON customers;
CREATE POLICY "Allow public read customers" ON customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin all customers" ON customers;
CREATE POLICY "Allow admin all customers" ON customers FOR ALL TO authenticated USING (true);

-- Orders Policies
DROP POLICY IF EXISTS "Allow public insert orders" ON orders;
CREATE POLICY "Allow public insert orders" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select orders" ON orders;
CREATE POLICY "Allow public select orders" ON orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin all orders" ON orders;
CREATE POLICY "Allow admin all orders" ON orders FOR ALL TO authenticated USING (true);

-- Order Items Policies
DROP POLICY IF EXISTS "Allow public insert order_items" ON order_items;
CREATE POLICY "Allow public insert order_items" ON order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select order_items" ON order_items;
CREATE POLICY "Allow public select order_items" ON order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin all order_items" ON order_items;
CREATE POLICY "Allow admin all order_items" ON order_items FOR ALL TO authenticated USING (true);

-- Settings Policies
DROP POLICY IF EXISTS "Allow public read settings" ON settings;
CREATE POLICY "Allow public read settings" ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin all settings" ON settings;
CREATE POLICY "Allow admin all settings" ON settings FOR ALL TO authenticated USING (true);

-- ----------------------------------------------------
-- Automatic Inventory Trigger (مزامنة المخزون التلقائية)
-- ----------------------------------------------------

CREATE OR REPLACE FUNCTION update_inventory_on_order_item_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Handle INSERT: decrement stock for the new product
    IF (TG_OP = 'INSERT') THEN
        IF NEW.product_id IS NOT NULL THEN
            UPDATE public.products
            SET inventory_stock = inventory_stock - NEW.quantity
            WHERE id = NEW.product_id AND inventory_stock IS NOT NULL;
        END IF;
        RETURN NEW;

    -- Handle UPDATE: adjust stock by difference
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.product_id IS DISTINCT FROM NEW.product_id THEN
            -- Restore stock to old product
            IF OLD.product_id IS NOT NULL THEN
                UPDATE public.products
                SET inventory_stock = inventory_stock + OLD.quantity
                WHERE id = OLD.product_id AND inventory_stock IS NOT NULL;
            END IF;
            -- Subtract stock from new product
            IF NEW.product_id IS NOT NULL THEN
                UPDATE public.products
                SET inventory_stock = inventory_stock - NEW.quantity
                WHERE id = NEW.product_id AND inventory_stock IS NOT NULL;
            END IF;
        ELSE
            -- Same product, quantity changed
            IF NEW.product_id IS NOT NULL AND OLD.quantity IS DISTINCT FROM NEW.quantity THEN
                UPDATE public.products
                SET inventory_stock = inventory_stock + (OLD.quantity - NEW.quantity)
                WHERE id = NEW.product_id AND inventory_stock IS NOT NULL;
            END IF;
        END IF;
        RETURN NEW;

    -- Handle DELETE: restore stock for removed product
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.product_id IS NOT NULL THEN
            UPDATE public.products
            SET inventory_stock = inventory_stock + OLD.quantity
            WHERE id = OLD.product_id AND inventory_stock IS NOT NULL;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_inventory_on_order_item_change ON public.order_items;

CREATE TRIGGER trg_update_inventory_on_order_item_change
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_order_item_change();

-- ----------------------------------------------------
-- Atomic RPC Function for Inventory Adjustments in Admin Panel
-- ----------------------------------------------------

CREATE OR REPLACE FUNCTION adjust_inventory_stock(product_id UUID, delta INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_stock INT;
BEGIN
    UPDATE public.products
    SET inventory_stock = COALESCE(inventory_stock, 0) + delta
    WHERE id = product_id AND inventory_stock IS NOT NULL
    RETURNING inventory_stock INTO new_stock;
    
    RETURN new_stock;
END;
$$;

-- ----------------------------------------------------
-- Storage Buckets Setup:
-- 1. 'product-images' (for catalog product photos)
-- 2. 'banner-images' (for daily offers & promotional banners)
-- ----------------------------------------------------

-- Insert buckets if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('product-images', 'product-images', true),
    ('banner-images', 'banner-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public Access for banner-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload for banner-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update for banner-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete for banner-images" ON storage.objects;

DROP POLICY IF EXISTS "Public Access for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete for product-images" ON storage.objects;

-- Storage Policies for banner-images (Public read + Any user can upload/manage)
CREATE POLICY "Public Access for banner-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'banner-images');

CREATE POLICY "Allow Upload for banner-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'banner-images');

CREATE POLICY "Allow Update for banner-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'banner-images');

CREATE POLICY "Allow Delete for banner-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'banner-images');

-- Storage Policies for product-images (Public read + Any user can upload/manage)
CREATE POLICY "Public Access for product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Allow Upload for product-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow Update for product-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

CREATE POLICY "Allow Delete for product-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

