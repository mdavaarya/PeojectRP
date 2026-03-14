-- =============================================
-- SILUMNI Database Schema
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'alumni' CHECK (role IN ('alumni', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALUMNI PROFILES
CREATE TABLE alumni_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nim TEXT NOT NULL UNIQUE,
  graduation_year INTEGER NOT NULL,
  study_program TEXT NOT NULL,
  linkedin_url TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- CAREER MILESTONES
CREATE TABLE career_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alumni_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  position_title TEXT NOT NULL,
  start_date DATE NOT NULL,
  classification_label TEXT NOT NULL CHECK (
    classification_label IN (
      'entry_level','mid_level','senior_level',
      'manager','director','executive','entrepreneur','other'
    )
  ),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    verification_status IN ('pending','verified','rejected')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SKILLS & CERTIFICATIONS
CREATE TABLE skills_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alumni_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
  certificate_name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "alumni_read_all" ON alumni_profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "alumni_manage_own" ON alumni_profiles FOR ALL USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "milestones_read_all" ON career_milestones FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "milestones_manage_own" ON career_milestones FOR ALL USING (
  EXISTS (SELECT 1 FROM alumni_profiles WHERE id = alumni_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "certs_read_all" ON skills_certifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "certs_manage_own" ON skills_certifications FOR ALL USING (
  EXISTS (SELECT 1 FROM alumni_profiles WHERE id = alumni_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- INDEXES
CREATE INDEX idx_alumni_profiles_user_id ON alumni_profiles(user_id);
CREATE INDEX idx_alumni_profiles_study_program ON alumni_profiles(study_program);
CREATE INDEX idx_career_milestones_alumni_id ON career_milestones(alumni_id);
CREATE INDEX idx_career_milestones_status ON career_milestones(verification_status);
CREATE INDEX idx_skills_certifications_alumni_id ON skills_certifications(alumni_id);

-- AUTO-UPDATE TIMESTAMPS
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_alumni_profiles_updated_at
  BEFORE UPDATE ON alumni_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_career_milestones_updated_at
  BEFORE UPDATE ON career_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
