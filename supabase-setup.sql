-- Create users table for WhatsApp bot conversations
-- This table will store user information from WhatsApp

CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone_number character varying(20) NOT NULL UNIQUE,
  display_name character varying(255) NULL,
  first_seen timestamp with time zone NULL DEFAULT now(),
  last_seen timestamp with time zone NULL DEFAULT now(),
  profile_data jsonb NULL DEFAULT '{}',
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users USING btree (phone_number) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON public.users USING btree (last_seen) TABLESPACE pg_default;

-- Create messages table to store individual messages (optional enhancement)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_phone character varying(20) NOT NULL,
  message_text text NOT NULL,
  message_type character varying(20) NOT NULL DEFAULT 'user', -- 'user', 'bot', 'system'
  metadata jsonb NULL DEFAULT '{}',
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages USING btree (conversation_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages USING btree (created_at) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_messages_user_phone ON public.messages USING btree (user_phone) TABLESPACE pg_default;

-- Function to automatically create user if not exists
CREATE OR REPLACE FUNCTION create_user_if_not_exists(phone_num text)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Check if user exists
  SELECT id INTO user_id FROM users WHERE phone_number = phone_num;

  -- If user doesn't exist, create them
  IF user_id IS NULL THEN
    INSERT INTO users (phone_number)
    VALUES (phone_num)
    RETURNING id INTO user_id;
  ELSE
    -- Update last seen
    UPDATE users SET last_seen = now() WHERE id = user_id;
  END IF;

  RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Sample data (optional - remove in production)
-- INSERT INTO users (phone_number, display_name) VALUES
-- ('1234567890', 'Test User 1'),
-- ('9876543210', 'Test User 2');

COMMENT ON TABLE users IS 'WhatsApp users who interact with the bot';
COMMENT ON TABLE messages IS 'Individual messages in conversations';
COMMENT ON FUNCTION create_user_if_not_exists(text) IS 'Creates user if not exists and updates last seen';