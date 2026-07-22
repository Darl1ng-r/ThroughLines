-- ThroughLines Enterprise Production Database Migration & Indexing Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    display_name TEXT CHECK (char_length(display_name) <= 100),
    bio TEXT CHECK (char_length(bio) <= 500),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Topics Table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_slug UNIQUE (user_id, slug)
);

-- 3. Private Entries Table
CREATE TABLE IF NOT EXISTS public.private_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 5000),
    confidence_rating INT NOT NULL CHECK (confidence_rating >= 0 AND confidence_rating <= 100),
    entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Public Posts Table
CREATE TABLE IF NOT EXISTS public.public_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    private_entry_id UUID NOT NULL REFERENCES public.private_entries(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 5000),
    confidence_rating INT NOT NULL CHECK (confidence_rating >= 0 AND confidence_rating <= 100),
    moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'flagged')),
    entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Nudges Table
CREATE TABLE IF NOT EXISTS public.nudges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    nudger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_topic_nudger UNIQUE (topic_id, nudger_id)
);

-- Automated TTL Cleanup Function for Nudges Table (removes nudges older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_nudges()
RETURNS void AS $$
BEGIN
    DELETE FROM public.nudges
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Production Performance Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON public.topics (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topics_slug ON public.topics (slug);
CREATE INDEX IF NOT EXISTS idx_private_entries_topic_date ON public.private_entries (topic_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_public_posts_feed ON public.public_posts (moderation_status, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_nudges_topic_id ON public.nudges (topic_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nudges ENABLE ROW LEVEL SECURITY;

-- RLS Security Policies
-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Topics Policies
CREATE POLICY "Users can view own topics" ON public.topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public topics viewable if has approved posts" ON public.topics FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.public_posts WHERE public_posts.topic_id = topics.id AND moderation_status = 'approved')
);
CREATE POLICY "Users can insert own topics" ON public.topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topics" ON public.topics FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own topics" ON public.topics FOR DELETE USING (auth.uid() = user_id);

-- Private Entries Policies
CREATE POLICY "Users can view own private entries" ON public.private_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own private entries" ON public.private_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own private entries" ON public.private_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own private entries" ON public.private_entries FOR DELETE USING (auth.uid() = user_id);

-- Public Posts Policies
CREATE POLICY "Approved public posts are viewable by everyone" ON public.public_posts FOR SELECT USING (moderation_status = 'approved' OR auth.uid() = user_id);
CREATE POLICY "Users can insert own public posts" ON public.public_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own public posts" ON public.public_posts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own public posts" ON public.public_posts FOR DELETE USING (auth.uid() = user_id);

-- Nudges Policies
CREATE POLICY "Topic owners can view nudges" ON public.nudges FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.topics WHERE topics.id = nudges.topic_id AND topics.user_id = auth.uid())
);
CREATE POLICY "Authenticated users can nudge topics of others once" ON public.nudges FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    nudger_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM public.topics WHERE topics.id = topic_id AND topics.user_id != auth.uid())
);
CREATE POLICY "Topic owners can delete nudges" ON public.nudges FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.topics WHERE topics.id = nudges.topic_id AND topics.user_id = auth.uid())
);

-- Enable Supabase Realtime WebSockets for Nudges and Public Posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.nudges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_posts;
