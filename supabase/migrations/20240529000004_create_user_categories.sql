-- Create user_categories junction table for category subscriptions and preferences
CREATE TABLE IF NOT EXISTS user_categories (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  is_subscribed BOOLEAN DEFAULT true,
  notification_enabled BOOLEAN DEFAULT true,
  last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, category_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_categories_user_id ON user_categories(user_id) WHERE is_subscribed = true;
CREATE INDEX IF NOT EXISTS idx_user_categories_category_id ON user_categories(category_id) WHERE is_subscribed = true;
CREATE INDEX IF NOT EXISTS idx_user_categories_favorites ON user_categories(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_categories_notifications ON user_categories(user_id, notification_enabled) WHERE notification_enabled = true;

-- Enable RLS
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own category subscriptions" ON user_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own category subscriptions" ON user_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category subscriptions" ON user_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category subscriptions" ON user_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Function to get user's subscribed categories with details
CREATE OR REPLACE FUNCTION get_user_categories(p_user_id UUID)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  category_icon_url TEXT,
  is_favorite BOOLEAN,
  is_subscribed BOOLEAN,
  notification_enabled BOOLEAN,
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  settings JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as category_id,
    c.name as category_name,
    c.icon_url as category_icon_url,
    uc.is_favorite,
    uc.is_subscribed,
    uc.notification_enabled,
    uc.last_interaction_at,
    uc.settings
  FROM categories c
  LEFT JOIN user_categories uc ON c.id = uc.category_id AND uc.user_id = p_user_id
  WHERE c.is_active = true
  ORDER BY 
    COALESCE(uc.is_favorite, false) DESC,
    COALESCE(uc.last_interaction_at, '1970-01-01'::timestamp with time zone) DESC,
    c.name;
END;
$$ LANGUAGE plpgsql;

-- Function to toggle favorite status
CREATE OR REPLACE FUNCTION toggle_category_favorite(p_user_id UUID, p_category_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_favorite BOOLEAN;
BEGIN
  INSERT INTO user_categories (user_id, category_id, is_favorite, last_interaction_at)
  VALUES (p_user_id, p_category_id, true, NOW())
  ON CONFLICT (user_id, category_id) 
  DO UPDATE SET 
    is_favorite = NOT user_categories.is_favorite,
    last_interaction_at = NOW(),
    updated_at = NOW()
  RETURNING is_favorite INTO v_is_favorite;
  
  RETURN v_is_favorite;
END;
$$ LANGUAGE plpgsql;

-- Function to update category subscription
CREATE OR REPLACE FUNCTION update_category_subscription(
  p_user_id UUID, 
  p_category_id UUID, 
  p_is_subscribed BOOLEAN,
  p_notification_enabled BOOLEAN DEFAULT NULL
)
RETURNS user_categories AS $$
DECLARE
  v_result user_categories;
BEGIN
  INSERT INTO user_categories (user_id, category_id, is_subscribed, notification_enabled, last_interaction_at)
  VALUES (p_user_id, p_category_id, p_is_subscribed, COALESCE(p_notification_enabled, p_is_subscribed), NOW())
  ON CONFLICT (user_id, category_id) 
  DO UPDATE SET 
    is_subscribed = p_is_subscribed,
    notification_enabled = COALESCE(p_notification_enabled, user_categories.notification_enabled),
    last_interaction_at = NOW(),
    updated_at = NOW()
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_categories_updated_at ON user_categories;
CREATE TRIGGER update_user_categories_updated_at BEFORE UPDATE ON user_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE user_categories IS 'User subscriptions and preferences for categories';
COMMENT ON COLUMN user_categories.is_favorite IS 'Whether user has marked this category as favorite';
COMMENT ON COLUMN user_categories.is_subscribed IS 'Whether user is subscribed to this category';
COMMENT ON COLUMN user_categories.notification_enabled IS 'Whether user wants notifications for this category';
COMMENT ON COLUMN user_categories.settings IS 'Category-specific user settings (JSON)';