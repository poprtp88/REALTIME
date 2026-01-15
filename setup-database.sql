-- Database Setup Script for Real-time Message Board
-- Run this in Supabase SQL Editor: https://app.supabase.com → SQL Editor

-- Create public_messages table
CREATE TABLE IF NOT EXISTS public_messages (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    telegram_sent BOOLEAN DEFAULT FALSE
);

-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_public_messages_created_at ON public_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (optional - will error if they don't exist, that's okay)
DROP POLICY IF EXISTS "Allow public SELECT" ON public_messages;
DROP POLICY IF EXISTS "Allow public INSERT" ON public_messages;
DROP POLICY IF EXISTS "Allow public UPDATE" ON public_messages;

-- Create policies for public access
-- SELECT: Anyone can read all messages
CREATE POLICY "Allow public SELECT" ON public_messages
    FOR SELECT
    USING (true);

-- INSERT: Anyone can insert new messages
CREATE POLICY "Allow public INSERT" ON public_messages
    FOR INSERT
    WITH CHECK (true);

-- UPDATE: Allow updating telegram_sent status (for the app to update status)
CREATE POLICY "Allow public UPDATE" ON public_messages
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Enable real-time for the table
-- This allows the table to broadcast changes via Supabase real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public_messages;

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'public_messages'
ORDER BY ordinal_position;

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'public_messages';

