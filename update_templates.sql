-- Update all bot message templates to match botflow_backup.md exactly
-- Run this in your Supabase SQL Editor

-- 1. Welcome Message
UPDATE message_templates
SET content = 'Hello

Hello, this is the Beforest support team for Members. Please let us know what you are looking for from the options below, and we''ll guide you further.

1. Collective Visit
2. Beforest Experiences
3. Bewild Produce
4. Beforest Hospitality
5. Contact Beforest Team'
WHERE key = 'welcome_message';

-- 2. Main Menu
UPDATE message_templates
SET content = 'Hello, this is the Beforest support team for Members. Please let us know what you are looking for from the options below, and we''ll guide you further.

1. Collective Visit
2. Beforest Experiences
3. Bewild Produce
4. Beforest Hospitality
5. Contact Beforest Team'
WHERE key = 'main_menu';

-- 3. Collective Visit Info Request
UPDATE message_templates
SET content = 'To help us arrange your group visit, please provide the following details:

1. Your name
2. Email address
3. Purpose of visit
4. Number of people visiting
5. Planned date and time of visit
6. Special requirements (if any)

You can type all this information in one message.'
WHERE key = 'collective_visit_info';

-- 4. Beforest Experiences
UPDATE message_templates
SET content = 'Beforest Experiences offers immersive journeys into nature that leave you with joy and a true sense of belonging. To know more about upcoming experiences: https://experiences.beforest.co/'
WHERE key = 'experiences_message';

-- 5. Bewild Produce
UPDATE message_templates
SET content = 'Bewild, rooted in restored landscapes, proves that good food comes from good practices, where forests and agriculture flourish together.

Discover Bewild Produce at https://bewild.life/'
WHERE key = 'bewild_message';

-- 6. Hospitality Options
UPDATE message_templates
SET content = 'Choose your preferred stay:

1. Blyton Bungalow, Poomaale Collective, Coorg
2. Glamping, Hyderabad Collective'
WHERE key = 'hospitality_options';

-- 7. Contact Beforest Team
UPDATE message_templates
SET content = 'For general queries, please write to crm@beforest.co to help us keep a clear record and provide detailed resolutions. You can also call us on +91 7680070541, Monday to Friday, 10 am to 6 pm.'
WHERE key = 'contact_team_message';

-- 8. Error Fallback
UPDATE message_templates
SET content = 'I don''t have that information readily available right now.

Please choose from our menu:
1. Collective Visit
2. Beforest Experiences
3. Bewild Produce
4. Beforest Hospitality
5. Contact Beforest Team'
WHERE key = 'error_fallback';

-- Verify updates
SELECT key, LEFT(content, 100) as preview, updated_at
FROM message_templates
WHERE key IN (
    'welcome_message',
    'main_menu',
    'collective_visit_info',
    'experiences_message',
    'bewild_message',
    'hospitality_options',
    'contact_team_message',
    'error_fallback'
)
ORDER BY key;
