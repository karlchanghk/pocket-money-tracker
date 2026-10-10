-- Supabase schema migration
-- Run this in Supabase SQL Editor after creating your project

create table if not exists users (
  id bigint generated always as identity primary key,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id) on delete cascade,
  name text not null,
  icon text default '💰',
  unique(user_id, name)
);

create table if not exists records (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id) on delete cascade,
  date date not null,
  amount numeric(12,2) not null,
  content text not null,
  category_id bigint references categories(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_records_user_date on records(user_id, date);
create index if not exists idx_records_category on records(category_id);
create index if not exists idx_categories_user on categories(user_id);

-- Seed default categories (run for each new user as needed)
-- insert into categories (user_id, name, icon) values
--   (1, '餐饮', '🍜'), (1, '交通', '🚌'), (1, '购物', '🛍️'),
--   (1, '娱乐', '🎮'), (1, '居家', '🏠'), (1, '其他', '📦');
