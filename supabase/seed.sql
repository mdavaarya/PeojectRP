-- =============================================
-- SILUMNI Seed Data
-- Run schema.sql first.
-- Replace UUIDs below with real Supabase Auth user IDs
-- after creating users via Auth dashboard or API.
-- =============================================

INSERT INTO users (id, email, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@silumni.ac.id', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'budi.santoso@alumni.ac.id', 'alumni'),
  ('00000000-0000-0000-0000-000000000003', 'siti.rahayu@alumni.ac.id', 'alumni'),
  ('00000000-0000-0000-0000-000000000004', 'ahmad.fauzi@alumni.ac.id', 'alumni'),
  ('00000000-0000-0000-0000-000000000005', 'dewi.lestari@alumni.ac.id', 'alumni')
ON CONFLICT DO NOTHING;

INSERT INTO alumni_profiles (id, user_id, full_name, nim, graduation_year, study_program, linkedin_url) VALUES
  ('ap000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Budi Santoso',  '190511001', 2023, 'Teknik Informatika', 'https://linkedin.com/in/budisantoso'),
  ('ap000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Siti Rahayu',   '190511002', 2023, 'Sistem Informasi',   'https://linkedin.com/in/sitirahayu'),
  ('ap000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'Ahmad Fauzi',   '180511003', 2022, 'Teknik Informatika', NULL),
  ('ap000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', 'Dewi Lestari',  '200511004', 2024, 'Manajemen',          'https://linkedin.com/in/dewilestari')
ON CONFLICT DO NOTHING;

INSERT INTO career_milestones (alumni_id, company_name, position_title, start_date, classification_label, verification_status) VALUES
  ('ap000001-0000-0000-0000-000000000001', 'Tokopedia',   'Software Engineer',           '2023-08-01', 'entry_level',  'verified'),
  ('ap000001-0000-0000-0000-000000000001', 'Startup XYZ', 'Backend Developer Intern',    '2023-01-15', 'entry_level',  'verified'),
  ('ap000001-0000-0000-0000-000000000002', 'Gojek',       'Data Analyst',                '2023-09-01', 'entry_level',  'pending'),
  ('ap000001-0000-0000-0000-000000000002', 'BCA',         'IT Business Analyst',         '2024-01-10', 'mid_level',    'pending'),
  ('ap000001-0000-0000-0000-000000000003', 'Bukalapak',   'Senior Software Engineer',    '2023-03-01', 'senior_level', 'verified'),
  ('ap000001-0000-0000-0000-000000000003', 'Freelance',   'Full Stack Developer',        '2022-06-01', 'mid_level',    'verified'),
  ('ap000001-0000-0000-0000-000000000004', 'Unilever',    'Management Trainee',          '2024-07-01', 'entry_level',  'pending');

INSERT INTO skills_certifications (alumni_id, certificate_name, issuer, year) VALUES
  ('ap000001-0000-0000-0000-000000000001', 'AWS Certified Developer – Associate', 'Amazon Web Services', 2023),
  ('ap000001-0000-0000-0000-000000000001', 'Google Cloud Professional',           'Google',              2024),
  ('ap000001-0000-0000-0000-000000000002', 'Google Data Analytics Certificate',   'Google',              2023),
  ('ap000001-0000-0000-0000-000000000002', 'Tableau Desktop Specialist',          'Salesforce',          2024),
  ('ap000001-0000-0000-0000-000000000003', 'Certified Kubernetes Administrator',  'CNCF',                2022),
  ('ap000001-0000-0000-0000-000000000003', 'Docker Certified Associate',          'Docker Inc.',         2023),
  ('ap000001-0000-0000-0000-000000000004', 'Project Management Professional',     'PMI',                 2024);
