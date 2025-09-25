-- Complete Supabase table setup for WhatsApp Bot
-- Creates dedicated tables without conflicts with existing schema

-- 1. Bot Users Table
CREATE TABLE IF NOT EXISTS public.bot_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone_number character varying(20) NOT NULL UNIQUE,
  display_name character varying(255) NULL,
  first_seen timestamp with time zone NULL DEFAULT now(),
  last_seen timestamp with time zone NULL DEFAULT now(),
  profile_data jsonb NULL DEFAULT '{}',
  is_active boolean NULL DEFAULT true,
  total_conversations integer NULL DEFAULT 0,
  total_messages integer NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT bot_users_pkey PRIMARY KEY (id),
  CONSTRAINT bot_users_phone_unique UNIQUE (phone_number)
) TABLESPACE pg_default;

-- 2. Bot Conversations Table
CREATE TABLE IF NOT EXISTS public.bot_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title character varying(255) NOT NULL,
  status character varying(50) NULL DEFAULT 'active',
  conversation_type character varying(50) NULL DEFAULT 'chat',
  created_at timestamp with time zone NULL DEFAULT now(),
  last_activity timestamp with time zone NULL DEFAULT now(),
  ended_at timestamp with time zone NULL,
  is_archived boolean NULL DEFAULT false,
  message_count integer NULL DEFAULT 0,
  metadata jsonb NULL DEFAULT '{}',
  CONSTRAINT bot_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT bot_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES bot_users (id) ON DELETE CASCADE,
  CONSTRAINT bot_conversations_status_check CHECK (
    status IN ('active', 'ended', 'escalated', 'archived')
  ),
  CONSTRAINT bot_conversations_type_check CHECK (
    conversation_type IN ('chat', 'support', 'booking', 'inquiry', 'feedback')
  )
) TABLESPACE pg_default;

-- 3. Bot Messages Table
CREATE TABLE IF NOT EXISTS public.bot_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_phone character varying(20) NOT NULL,
  message_text text NOT NULL,
  message_type character varying(20) NOT NULL DEFAULT 'user',
  intent_recognized character varying(100) NULL,
  confidence_score decimal(3,2) NULL,
  processing_time_ms integer NULL,
  metadata jsonb NULL DEFAULT '{}',
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT bot_messages_pkey PRIMARY KEY (id),
  CONSTRAINT bot_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES bot_conversations (id) ON DELETE CASCADE,
  CONSTRAINT bot_messages_type_check CHECK (
    message_type IN ('user', 'bot', 'system', 'error', 'escalation')
  )
) TABLESPACE pg_default;

-- 4. Bot Analytics Table (for tracking bot performance)
CREATE TABLE IF NOT EXISTS public.bot_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  metric_type character varying(50) NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  metadata jsonb NULL DEFAULT '{}',
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT bot_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT bot_analytics_date_metric_unique UNIQUE (date, metric_type),
  CONSTRAINT bot_analytics_metric_check CHECK (
    metric_type IN ('total_users', 'active_users', 'total_conversations', 'total_messages', 'avg_response_time', 'escalation_rate', 'user_satisfaction')
  )
) TABLESPACE pg_default;

-- 5. Bot Intent Tracking Table
CREATE TABLE IF NOT EXISTS public.bot_intents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  original_message text NOT NULL,
  recognized_intent character varying(50) NULL,
  confidence_score decimal(3,2) NULL,
  processing_method character varying(20) NULL, -- 'keyword', 'llm', 'manual'
  was_correct boolean NULL, -- for learning/improvement
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT bot_intents_pkey PRIMARY KEY (id),
  CONSTRAINT bot_intents_message_id_fkey FOREIGN KEY (message_id) REFERENCES bot_messages (id) ON DELETE CASCADE,
  CONSTRAINT bot_intents_method_check CHECK (
    processing_method IN ('keyword', 'llm', 'manual', 'fallback')
  ),
  CONSTRAINT bot_intents_intent_check CHECK (
    recognized_intent IN ('welcome', 'menu', 'collective_visit', 'experiences', 'products', 'hospitality', 'query', 'escalation', 'unknown')
  )
) TABLESPACE pg_default;

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_bot_users_phone ON public.bot_users USING btree (phone_number) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bot_users_last_seen ON public.bot_users USING btree (last_seen DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bot_users_active ON public.bot_users USING btree (is_active) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_bot_conversations_user_id ON public.bot_conversations USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bot_conversations_last_activity ON public.bot_conversations USING btree (last_activity DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bot_conversations_status ON public.bot_conversations USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bot_conversations_type ON public.bot_conversations USING btree (conversation_type) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_bot_messages_conversation_id ON public.bot_messages USING btree (conversation_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bot_messages_created_at ON public.bot_messages USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bot_messages_user_phone ON public.bot_messages USING btree (user_phone) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bot_messages_type ON public.bot_messages USING btree (message_type) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bot_messages_intent ON public.bot_messages USING btree (intent_recognized) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_bot_analytics_date ON public.bot_analytics USING btree (date DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bot_analytics_metric ON public.bot_analytics USING btree (metric_type) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_bot_intents_message_id ON public.bot_intents USING btree (message_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bot_intents_intent ON public.bot_intents USING btree (recognized_intent) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bot_intents_method ON public.bot_intents USING btree (processing_method) TABLESPACE pg_default;

-- PostgreSQL Functions

-- Function to create/update bot user
CREATE OR REPLACE FUNCTION upsert_bot_user(phone_num text, display_name_param text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Insert or update user
  INSERT INTO bot_users (phone_number, display_name, last_seen)
  VALUES (phone_num, display_name_param, now())
  ON CONFLICT (phone_number)
  DO UPDATE SET
    last_seen = now(),
    display_name = COALESCE(EXCLUDED.display_name, bot_users.display_name)
  RETURNING id INTO user_id;

  RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update conversation statistics
CREATE OR REPLACE FUNCTION update_conversation_stats(conv_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE bot_conversations
  SET
    message_count = (
      SELECT COUNT(*)
      FROM bot_messages
      WHERE conversation_id = conv_id
    ),
    last_activity = now()
  WHERE id = conv_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_stats(user_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE bot_users
  SET
    total_conversations = (
      SELECT COUNT(*)
      FROM bot_conversations
      WHERE user_id = user_uuid
    ),
    total_messages = (
      SELECT COUNT(*)
      FROM bot_messages m
      JOIN bot_conversations c ON m.conversation_id = c.id
      WHERE c.user_id = user_uuid AND m.message_type = 'user'
    ),
    last_seen = now()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to log daily analytics
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS void AS $$
DECLARE
  today_date date := CURRENT_DATE;
BEGIN
  -- Total users
  INSERT INTO bot_analytics (date, metric_type, metric_value)
  VALUES (today_date, 'total_users', (SELECT COUNT(*) FROM bot_users))
  ON CONFLICT (date, metric_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, created_at = now();

  -- Active users (last 24 hours)
  INSERT INTO bot_analytics (date, metric_type, metric_value)
  VALUES (today_date, 'active_users', (
    SELECT COUNT(*) FROM bot_users
    WHERE last_seen >= CURRENT_DATE
  ))
  ON CONFLICT (date, metric_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, created_at = now();

  -- Total conversations today
  INSERT INTO bot_analytics (date, metric_type, metric_value)
  VALUES (today_date, 'total_conversations', (
    SELECT COUNT(*) FROM bot_conversations
    WHERE created_at::date = today_date
  ))
  ON CONFLICT (date, metric_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, created_at = now();

  -- Total messages today
  INSERT INTO bot_analytics (date, metric_type, metric_value)
  VALUES (today_date, 'total_messages', (
    SELECT COUNT(*) FROM bot_messages
    WHERE created_at::date = today_date
  ))
  ON CONFLICT (date, metric_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, created_at = now();
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update statistics

-- Trigger to update conversation stats when message is added
CREATE OR REPLACE FUNCTION trigger_update_conversation_stats()
RETURNS trigger AS $$
BEGIN
  PERFORM update_conversation_stats(NEW.conversation_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_stats_trigger
    AFTER INSERT ON bot_messages
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_conversation_stats();

-- Views for easy data access

-- View for conversation summary with user info
CREATE OR REPLACE VIEW bot_conversation_summary AS
SELECT
  c.id as conversation_id,
  c.title,
  c.status,
  c.conversation_type,
  c.created_at,
  c.last_activity,
  c.message_count,
  u.phone_number,
  u.display_name,
  u.total_conversations as user_total_conversations,
  (c.metadata->>'initial_message') as initial_message,
  (c.metadata->>'platform') as platform
FROM bot_conversations c
JOIN bot_users u ON c.user_id = u.id
WHERE c.is_archived = false;

-- View for recent activity
CREATE OR REPLACE VIEW bot_recent_activity AS
SELECT
  m.id as message_id,
  m.message_text,
  m.message_type,
  m.intent_recognized,
  m.created_at,
  c.title as conversation_title,
  u.phone_number,
  u.display_name
FROM bot_messages m
JOIN bot_conversations c ON m.conversation_id = c.id
JOIN bot_users u ON c.user_id = u.id
ORDER BY m.created_at DESC
LIMIT 100;

-- View for daily statistics
CREATE OR REPLACE VIEW bot_daily_stats AS
SELECT
  date,
  MAX(CASE WHEN metric_type = 'total_users' THEN metric_value END) as total_users,
  MAX(CASE WHEN metric_type = 'active_users' THEN metric_value END) as active_users,
  MAX(CASE WHEN metric_type = 'total_conversations' THEN metric_value END) as conversations_today,
  MAX(CASE WHEN metric_type = 'total_messages' THEN metric_value END) as messages_today
FROM bot_analytics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- Comments for documentation
COMMENT ON TABLE bot_users IS 'WhatsApp bot users with profile and activity tracking';
COMMENT ON TABLE bot_conversations IS 'Individual conversations with categorization and metadata';
COMMENT ON TABLE bot_messages IS 'All messages exchanged in conversations with intent tracking';
COMMENT ON TABLE bot_analytics IS 'Daily analytics and performance metrics';
COMMENT ON TABLE bot_intents IS 'Intent recognition tracking for ML improvement';

COMMENT ON FUNCTION upsert_bot_user(text, text) IS 'Creates or updates a bot user and returns UUID';
COMMENT ON FUNCTION update_conversation_stats(uuid) IS 'Updates message count and activity for a conversation';
COMMENT ON FUNCTION update_user_stats(uuid) IS 'Updates total conversations and messages for a user';
COMMENT ON FUNCTION update_daily_analytics() IS 'Updates daily analytics metrics (run via cron)';

-- Enable Row Level Security (optional - uncomment if needed)
-- ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bot_conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bot_analytics ENABLE ROW LEVEL SECURITY;

-- Sample policies (optional - uncomment and modify as needed)
-- CREATE POLICY "bot_users_policy" ON bot_users FOR ALL USING (true);
-- CREATE POLICY "bot_conversations_policy" ON bot_conversations FOR ALL USING (true);
-- CREATE POLICY "bot_messages_policy" ON bot_messages FOR ALL USING (true);

COMMIT;