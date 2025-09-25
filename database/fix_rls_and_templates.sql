-- Fix RLS policies and ensure templates are accessible
-- Run this in Supabase SQL Editor

-- First, temporarily disable RLS to check and fix data
ALTER TABLE message_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_categories DISABLE ROW LEVEL SECURITY;

-- Check existing templates
SELECT 'Existing templates count: ' || COUNT(*) as status FROM message_templates;
SELECT 'Existing categories count: ' || COUNT(*) as status FROM message_categories;

-- Clear templates if any exist (to avoid duplicates)
DELETE FROM message_templates;

-- Insert fresh templates
INSERT INTO message_templates (key, title, content, variables, category, description, is_active) VALUES
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

*Just type the number to continue!*', '["name"]'::jsonb, 'greetings', 'Main welcome message with service options', true),

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

*Just type the number to continue!*', '[]'::jsonb, 'main_menu', 'Main menu options', true),

('collective_visit_options', 'Collective Visit Options', '*Collective Visit*

Planning a group experience? Perfect!

Which collective are you interested in?

1. *Mumbai Collective*
2. *Hyderabad Collective*
3. *Bhopal Collective*
4. *Poomale 2.0*
5. *Hammiyala Collective*

Please select 1-5 or type "menu" to go back.', '[]'::jsonb, 'collective_visit', 'Collective selection options', true),

('collective_info_request', 'Collective Information Request', '*{{collective}}*

Great choice! To help us arrange your group visit, please provide:

*Please send the following information:*
• Your name
• Email address
• Number of people visiting
• Planned date of visit

You can type all this information in one message.

Type "menu" to go back to main options.', '["collective"]'::jsonb, 'collective_visit', 'Information gathering for collective visits', true),

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

Type "menu" to explore more options!', '[]'::jsonb, 'bewild_produce', 'Bewild products information', true),

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

Type "menu" for more options!', '[]'::jsonb, 'experiences', 'Main experiences information', true),

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

Type "menu" to explore more options.', '[]'::jsonb, 'general_query', 'General query and contact information', true),

('hospitality_options', 'Hospitality Options', '*Beforest Hospitality*

Choose your perfect stay:

1. *Blyton Bungalow, Poomaale Collective, Coorg*
   Heritage bungalow in coffee plantations

2. *Glamping, Hyderabad Collective*
   Luxury tents with modern amenities

Please select 1 or 2 to continue.', '[]'::jsonb, 'hospitality', 'Hospitality accommodation options', true),

('info_received', 'Information Received', '✅ *Information received!*', '[]'::jsonb, 'confirmations', 'Quick acknowledgment message', true),

('error_fallback', 'Error Fallback', 'I didn''t quite understand that. Let me show you our options:

Type "menu" to see all services or try:
• "collective" for group visits
• "experiences" for nature activities
• "bewild" for our products
• "hospitality" for accommodations
• "query" for questions', '[]'::jsonb, 'errors', 'AI fallback when input not understood', true);

-- Now set up proper RLS policies that allow public read access
-- Drop existing policies first
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON message_templates;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON message_templates;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON message_templates;
DROP POLICY IF EXISTS "Enable read access for all" ON message_categories;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON message_categories;

-- Create permissive policies for admin dashboard
CREATE POLICY "Allow public read access" ON message_templates
    FOR SELECT USING (true);

CREATE POLICY "Allow public write access" ON message_templates
    FOR ALL USING (true);

CREATE POLICY "Allow public read access" ON message_categories
    FOR SELECT USING (true);

-- Re-enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_categories ENABLE ROW LEVEL SECURITY;

-- Verify the setup
SELECT 'Final template count: ' || COUNT(*) as result FROM message_templates;
SELECT 'Final category count: ' || COUNT(*) as result FROM message_categories;
SELECT 'Setup complete! ✅' as status;