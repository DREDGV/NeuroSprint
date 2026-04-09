-- Feedback & Ideas Schema
-- Таблицы для приватных отзывов и публичной доски идей

-- ============================================================================
-- 1. feedback_entries — приватные отзывы о продукте и тренажёрах
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submitter_kind text NOT NULL CHECK (submitter_kind IN ('guest', 'account')),
  account_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  training_profile_id uuid,
  guest_token_hash text,
  source_surface text NOT NULL CHECK (source_surface IN ('post_session', 'global_form')),
  category text NOT NULL CHECK (category IN ('bug', 'ux', 'idea', 'question', 'praise')),
  module_id text,
  mode_id text,
  route text,
  sentiment text,
  star_rating integer CHECK (star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 10)),
  reasons text[],
  comment text NOT NULL,
  contact_email text,
  client_context jsonb,
  review_status text NOT NULL DEFAULT 'new' CHECK (review_status IN ('new', 'reviewed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Индексы для feedback_entries
CREATE INDEX IF NOT EXISTS idx_feedback_submitter_kind ON feedback_entries(submitter_kind);
CREATE INDEX IF NOT EXISTS idx_feedback_account_id ON feedback_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_feedback_guest_token_hash ON feedback_entries(guest_token_hash);
CREATE INDEX IF NOT EXISTS idx_feedback_source_surface ON feedback_entries(source_surface);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback_entries(category);
CREATE INDEX IF NOT EXISTS idx_feedback_module_id ON feedback_entries(module_id);
CREATE INDEX IF NOT EXISTS idx_feedback_review_status ON feedback_entries(review_status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback_entries(created_at DESC);

-- Уникальный индекс для предотвращения дублей post-session feedback (account + module + day)
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_post_session_unique
  ON feedback_entries (COALESCE(account_id::text, guest_token_hash), module_id, DATE(created_at))
  WHERE source_surface = 'post_session';

-- ============================================================================
-- 2. idea_posts — публичная доска идей
-- ============================================================================

CREATE TABLE IF NOT EXISTS idea_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_account_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  author_profile_id uuid,
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL CHECK (category IN ('training', 'ux', 'progress', 'social', 'account', 'stats', 'other')),
  moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  roadmap_status text NOT NULL DEFAULT 'new' CHECK (roadmap_status IN ('new', 'planned', 'in_progress', 'done', 'declined')),
  rejection_note text,
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Индексы для idea_posts
CREATE INDEX IF NOT EXISTS idx_ideas_author_account_id ON idea_posts(author_account_id);
CREATE INDEX IF NOT EXISTS idx_ideas_moderation_status ON idea_posts(moderation_status);
CREATE INDEX IF NOT EXISTS idx_ideas_roadmap_status ON idea_posts(roadmap_status);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON idea_posts(category);
CREATE INDEX IF NOT EXISTS idx_ideas_vote_count ON idea_posts(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON idea_posts(created_at DESC);

-- Уникальный индекс для предотвращения дублей идей от одного аккаунта
CREATE UNIQUE INDEX IF NOT EXISTS idx_ideas_unique_title_per_author
  ON idea_posts (author_account_id, LOWER(TRIM(title)))
  WHERE moderation_status IN ('pending', 'approved');

-- ============================================================================
-- 3. idea_votes — голоса за идеи
-- ============================================================================

CREATE TABLE IF NOT EXISTS idea_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id uuid REFERENCES idea_posts(id) ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(idea_id, account_id)
);

-- Индексы для idea_votes
CREATE INDEX IF NOT EXISTS idx_votes_idea_id ON idea_votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_votes_account_id ON idea_votes(account_id);

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

-- feedback_entries: полный доступ только через service_role (server-side API)
-- Никаких анонимных политик — всё через API
ALTER TABLE feedback_entries ENABLE ROW LEVEL SECURITY;

-- idea_posts: чтение approved для всех, запись/изменение только через API
ALTER TABLE idea_posts ENABLE ROW LEVEL SECURITY;

-- Публичное чтение одобренных идей
CREATE POLICY "Anyone can read approved ideas"
  ON idea_posts FOR SELECT
  USING (moderation_status = 'approved');

-- Автор видит свои идеи в любом статусе
CREATE POLICY "Authors can read their own ideas"
  ON idea_posts FOR SELECT
  USING (auth.uid() = author_account_id);

-- idea_votes: чтение для всех, запись через API
ALTER TABLE idea_votes ENABLE ROW LEVEL SECURITY;

-- Публичное чтение голосов
CREATE POLICY "Anyone can read idea votes"
  ON idea_votes FOR SELECT
  USING (true);

-- ============================================================================
-- 5. Trigger для обновления vote_count
-- ============================================================================

CREATE OR REPLACE FUNCTION update_idea_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE idea_posts SET vote_count = vote_count + 1 WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE idea_posts SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_idea_vote_count_insert
  AFTER INSERT ON idea_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_vote_count();

CREATE TRIGGER trigger_idea_vote_count_delete
  AFTER DELETE ON idea_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_vote_count();
