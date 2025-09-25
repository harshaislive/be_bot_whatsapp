-- Simple template insertion without conflicts
-- Run this in Supabase SQL Editor

-- First, clear any existing templates (if needed)
-- DELETE FROM message_templates;

-- Insert core templates one by one
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

*Just type the number to continue!*', '["name"]'::jsonb, 'greetings', 'Main welcome message with service options', true);

INSERT INTO message_templates (key, title, content, variables, category, description, is_active) VALUES
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

*Just type the number to continue!*', '[]'::jsonb, 'main_menu', 'Main menu options', true);

INSERT INTO message_templates (key, title, content, variables, category, description, is_active) VALUES
('collective_visit_options', 'Collective Visit Options', '*Collective Visit*

Planning a group experience? Perfect!

Which collective are you interested in?

1. *Mumbai Collective*
2. *Hyderabad Collective*
3. *Bhopal Collective*
4. *Poomale 2.0*
5. *Hammiyala Collective*

Please select 1-5 or type "menu" to go back.', '[]'::jsonb, 'collective_visit', 'Collective selection options', true);

INSERT INTO message_templates (key, title, content, variables, category, description, is_active) VALUES
('collective_info_request', 'Collective Information Request', '*{{collective}}*

Great choice! To help us arrange your group visit, please provide:

*Please send the following information:*
• Your name
• Email address
• Number of people visiting
• Planned date of visit

You can type all this information in one message.

Type "menu" to go back to main options.', '["collective"]'::jsonb, 'collective_visit', 'Information gathering for collective visits', true);

INSERT INTO message_templates (key, title, content, variables, category, description, is_active) VALUES
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

Type "menu" to explore more options!', '[]'::jsonb, 'bewild_produce', 'Bewild products information', true);

INSERT INTO message_templates (key, title, content, variables, category, description, is_active) VALUES
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

Type "menu" for more options!', '[]'::jsonb, 'experiences', 'Main experiences information', true);

INSERT INTO message_templates (key, title, content, variables, category, description, is_active) VALUES
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

Type "menu" to explore more options.', '[]'::jsonb, 'general_query', 'General query and contact information', true);

INSERT INTO message_templates (key, title, content, variables, category, description, is_active) VALUES
('hospitality_options', 'Hospitality Options', '*Beforest Hospitality*

Choose your perfect stay:

1. *Blyton Bungalow, Poomaale Collective, Coorg*
   Heritage bungalow in coffee plantations

2. *Glamping, Hyderabad Collective*
   Luxury tents with modern amenities

Please select 1 or 2 to continue.', '[]'::jsonb, 'hospitality', 'Hospitality accommodation options', true);

-- Success message
SELECT 'Templates inserted successfully! Count: ' || COUNT(*) as result FROM message_templates;