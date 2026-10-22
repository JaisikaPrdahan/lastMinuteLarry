create table if not exists subjects (
  id serial primary key,
  name text not null,
  color text not null default '#5a5ae6',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists chapters (
  id serial primary key,
  subject_id int not null references subjects(id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists materials (
  id serial primary key,
  chapter_id int not null references chapters(id) on delete cascade,
  title text not null,
  kind text not null default 'ppt' check (kind in ('ppt','program','other')),
  file_url text,
  file_name text,
  file_size bigint,
  est_minutes int,
  done boolean not null default false,
  done_at timestamptz,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists exams (
  id serial primary key,
  subject_id int not null references subjects(id) on delete cascade,
  kind text not null default 'theory' check (kind in ('theory','practical')),
  exam_date date not null,
  exam_time text,
  scope text not null default 'all' check (scope in ('all','ppt','program')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists study_sessions (
  id serial primary key,
  session_date date not null,
  subject_id int references subjects(id) on delete set null,
  minutes int not null check (minutes > 0),
  material_ids int[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists habit_logs (
  log_date date not null,
  kind text not null check (kind in ('gym','dsa','breakfast','lunch','dinner')),
  count int not null default 1,
  note text,
  created_at timestamptz not null default now(),
  primary key (log_date, kind)
);

create table if not exists settings (
  key text primary key,
  value jsonb not null
);

create table if not exists push_subscriptions (
  id serial primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists sent_reminders (
  key text primary key,
  sent_at timestamptz not null default now()
);

create table if not exists login_failures (
  ts timestamptz not null default now()
);

create index if not exists idx_sessions_date on study_sessions (session_date);
create index if not exists idx_chapters_subject on chapters (subject_id);
create index if not exists idx_materials_chapter on materials (chapter_id);
create index if not exists idx_exams_date on exams (exam_date);
