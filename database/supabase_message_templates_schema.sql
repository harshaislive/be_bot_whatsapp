-- =========================================
-- BEFOREST MESSAGE TEMPLATES DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =========================================

-- Create message templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key varchar(100) UNIQUE NOT NULL,
  title varchar(200) NOT NULL,
  content text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  category varchar(50) NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create message usage analytics table
CREATE TABLE IF NOT EXISTS message_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key varchar(100) REFERENCES message_templates(key) ON DELETE CASCADE,
  used_at timestamp with time zone DEFAULT now(),
  user_phone varchar(20),
  response_time_ms integer,
  context jsonb DEFAULT '{}'::jsonb
);

-- Create message categories table for better organization
CREATE TABLE IF NOT EXISTS message_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar(50) UNIQUE NOT NULL,
  display_name varchar(100) NOT NULL,
  description text,
  color varchar(7) DEFAULT '#3b82f6', -- hex color for UI
  created_at timestamp with time zone DEFAULT now()
);

-- Create admin users table for role management
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email varchar(255) NOT NULL,
  role varchar(20) DEFAULT 'editor', -- 'admin', 'editor', 'viewer'
  permissions jsonb DEFAULT '["read"]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to message_templates
DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
CREATE TRIGGER update_message_templates_updated_at
    BEFORE UPDATE ON message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to admin_users
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO message_categories (name, display_name, description, color) VALUES
('greetings', 'Greetings & Welcome', 'Welcome messages and greetings', '#10b981'),
('main_menu', 'Main Menu', 'Main menu options and navigation', '#3b82f6'),
('collective_visit', 'Collective Visits', 'Group visit related messages', '#f59e0b'),
('experiences', 'Experiences', 'Nature experiences and activities', '#10b981'),
('bewild_produce', 'Bewild Produce', 'Product information and links', '#8b5cf6'),
('hospitality', 'Hospitality', 'Accommodation and booking messages', '#ef4444'),
('general_query', 'General Queries', 'Support and contact messages', '#6b7280'),
('confirmations', 'Confirmations', 'Confirmation and acknowledgment messages', '#14b8a6'),
('errors', 'Error Messages', 'Error handling and fallback messages', '#ef4444')
ON CONFLICT (name) DO NOTHING;

-- Insert initial message templates with current bot messages
INSERT INTO message_templates (key, title, content, variables, category, description) VALUES
-- Welcome Messages
('welcome_message', 'Main Welcome Message', 'Hey {{name}}! 👋

*Welcome to Beforest* 🌿

We''re thrilled you''re here! Beforest is your gateway to authentic nature experiences, sustainable living, and meaningful connections with the wilderness.

*Here''s what we offer:*

🏔️ *1. Collective Visit*
   Group experiences in restored forests

🌲 *2. Beforest Experiences*
   Curated nature activities & workshops

🍯 *3. Bewild Produce*
   Sustainable, forest-found ingredients

🏡 *4. Beforest Hospitality*
   Eco-friendly stays in nature

❓ *5. General Query*
   Get support or schedule a call

*Just type the number to continue!*', '["name"]', 'greetings', 'Main welcome message with service options'),

-- Collective Visit Messages
('collective_visit_options', 'Collective Visit Options', '*Collective Visit*

Planning a group experience? Perfect!

Which collective are you interested in?

1. *Mumbai Collective*
2. *Hyderabad Collective*
3. *Bhopal Collective*
4. *Poomale 2.0*
5. *Hammiyala Collective*

Please select 1-5 or type "menu" to go back.', '[]', 'collective_visit', 'Collective selection options'),

('collective_info_request', 'Collective Information Request', '*{{collective}}*

Great choice! To help us arrange your group visit, please provide:

*Please send the following information:*
• Your name
• Email address
• Number of people visiting
• Planned date of visit

You can type all this information in one message.

Type "menu" to go back to main options.', '["collective"]', 'collective_visit', 'Information gathering for collective visits'),

('collective_confirmation', 'Collective Visit Confirmation', '*Thank you for your interest!*

We''ve received your information for *{{collective}}*.

Our team will review your details and get back to you within 24 hours.

*What happens next?*
• Our team reviews your request
• We''ll send you a detailed itinerary
• Payment and booking confirmation

For immediate assistance, contact us at:
*Email:* crm@beforest.co

Type "menu" for more options!', '["collective"]', 'collective_visit', 'Confirmation after info submission'),

-- Experience Messages
('experiences_message', 'Beforest Experiences', '*Beforest Experiences*

Discover our unique nature experiences!

*Visit our experiences page:*
https://experiences.beforest.co

*What awaits you:*
• Forest bathing sessions
• Wildlife photography workshops
• Sustainable living experiences
• Guided nature walks
• Farm-to-table dining

Type "menu" for more options!', '[]', 'experiences', 'Main experiences information'),

-- Bewild Messages
('bewild_message', 'Bewild Produce Information', '*Bewild Produce*

*Ingredients that did not give up* 🌿

Born from restored forest landscapes, each Bewild ingredient is a testament to nature''s resilience.

*Our Story:*
Found in the wild coffee forests of Coorg, our ingredients grow free in their natural habitats—just like nature intended.

*What makes us special:*
• Forest-found, not farmed ingredients
• Native & heirloom varieties
• Chemical-free & wild-crafted
• Supporting 100+ acres of restoration

*Visit Bewild:*
https://bewild.life

Type "menu" to explore more options!', '[]', 'bewild_produce', 'Bewild products information'),

-- Hospitality Messages
('hospitality_options', 'Hospitality Options', '*Beforest Hospitality*

Choose your perfect stay:

1. *Blyton Bungalow, Poomaale Collective, Coorg*
   Heritage bungalow in coffee plantations

2. *Glamping, Hyderabad Collective*
   Luxury tents with modern amenities

Please select 1 or 2 to continue.', '[]', 'hospitality', 'Hospitality accommodation options'),

('blyton_bungalow_info', 'Blyton Bungalow Information', '*Blyton Bungalow, Coorg*

Experience heritage hospitality in coffee country!

*Book your stay:*
Visit: hospitality.beforest.co

*What makes it special:*
• Heritage colonial bungalow
• Surrounded by coffee plantations
• Authentic Coorg experiences
• Farm-to-table dining

*Perfect for:*
Couples, families, and small groups seeking tranquility.

Type "menu" to explore more options!', '[]', 'hospitality', 'Blyton Bungalow detailed information'),

('glamping_info', 'Glamping Information', '*Glamping, Hyderabad Collective*

Luxury meets wilderness!

*Book your glamping experience:*
https://docs.google.com/forms/d/e/1FAIpQLSfnJDGgi6eSbx-pVdPrZQvgkqlxFuPja4UGaYLLyRBmYzx_zg/viewform

*What awaits you:*
• Luxury tents with modern amenities
• Surrounded by restored forest
• Stargazing and nature walks
• Gourmet outdoor dining

*Perfect for:*
Adventure seekers wanting comfort in nature.

Type "menu" for more options!', '[]', 'hospitality', 'Glamping detailed information'),

-- General Query Messages
('general_query_message', 'General Query Information', '*General Query*

Have a question? We''re here to help!

📧 *Send your query to:*
crm@beforest.co

📞 *Or call us:*
Monday to Friday, 10 AM - 6 PM

*When sending your query, please include:*
• Your question or requirement
• Good time to speak (if you prefer a call)
• Your preferred contact method

Simply tap the email above to send your query directly!

Type "menu" to explore more options.', '[]', 'general_query', 'General query and contact information'),

-- Menu Messages
('main_menu', 'Main Menu', '*Welcome to Beforest*

Please select an option:

🏔️ *1. Collective Visit*
   Group experiences in restored forests

🌲 *2. Beforest Experiences*
   Forest activities & guided tours

🍯 *3. Bewild Produce*
   Sustainable forest ingredients

🏡 *4. Beforest Hospitality*
   Nature stays & accommodations

❓ *5. General Query*
   Get support or schedule a call

*Just type the number to continue!*', '[]', 'main_menu', 'Main menu options'),

-- Acknowledgment Messages
('info_received', 'Information Received', '✅ *Information received!*', '[]', 'confirmations', 'Quick acknowledgment message'),

('acknowledgment_response', 'General Acknowledgment', 'You''re welcome! Type "menu" for more options.', '[]', 'confirmations', 'General acknowledgment response'),

-- Error Messages
('invalid_option', 'Invalid Option', 'Please select a valid option (1-5) or type "menu" to go back.', '[]', 'errors', 'Invalid menu option message'),

('error_fallback', 'Error Fallback', 'I didn''t quite understand that. Let me show you our options:

Type "menu" to see all services or try:
• "collective" for group visits
• "experiences" for nature activities
• "bewild" for our products
• "hospitality" for accommodations
• "query" for questions', '[]', 'errors', 'AI fallback when input not understood'),

('technical_error', 'Technical Error', 'Sorry, something went wrong. Type "menu" to continue.', '[]', 'errors', 'General technical error message')

ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON message_templates;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON message_templates;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON message_templates;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON message_usage;
DROP POLICY IF EXISTS "Enable insert for service account" ON message_usage;
DROP POLICY IF EXISTS "Enable read access for all" ON message_categories;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON message_categories;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON admin_users;

-- Create RLS policies for message_templates
CREATE POLICY "Enable read access for authenticated users" ON message_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON message_templates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON message_templates
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for message_usage (read-only for analytics)
CREATE POLICY "Enable read access for authenticated users" ON message_usage
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service account" ON message_usage
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for message_categories
CREATE POLICY "Enable read access for all" ON message_categories
    FOR SELECT USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON message_categories
    FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for admin_users
CREATE POLICY "Enable read access for authenticated users" ON admin_users
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_templates_key ON message_templates(key);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_message_usage_template_key ON message_usage(template_key);
CREATE INDEX IF NOT EXISTS idx_message_usage_used_at ON message_usage(used_at);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- Create view for message templates with category info
DROP VIEW IF EXISTS message_templates_with_category;
CREATE VIEW message_templates_with_category AS
SELECT
    mt.*,
    mc.display_name as category_display_name,
    mc.color as category_color,
    mc.description as category_description
FROM message_templates mt
LEFT JOIN message_categories mc ON mt.category = mc.name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Message Templates Database Schema Created Successfully!';
    RAISE NOTICE '📊 Tables: message_templates, message_usage, message_categories, admin_users';
    RAISE NOTICE '🎯 Sample Data: 9 categories + 15 message templates loaded';
    RAISE NOTICE '🔐 Row Level Security: Enabled with proper policies';
    RAISE NOTICE '🚀 Ready for admin dashboard integration!';
END
$$;