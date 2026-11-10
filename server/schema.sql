-- ChessPage accounts and scores. Safe to run again: every statement is "if not exists".
create table if not exists users (
  id bigint generated always as identity primary key,
  uid text not null unique,            -- Firebase user id
  name text not null default '',
  email text not null default '',
  username text,
  country char(2),
  created_at timestamptz not null default now()
);
create unique index if not exists users_username on users (lower(username));

-- The country a player counts for on a day, fixed at their first play that day.
create table if not exists days (
  user_id bigint not null references users (id) on delete cascade,
  date date not null,
  country char(2) not null,
  primary key (user_id, date)
);
create index if not exists days_board on days (date, country);

create table if not exists plays (
  user_id bigint not null references users (id) on delete cascade,
  date date not null,
  level smallint not null,
  ply smallint not null,
  tried jsonb not null default '[]',
  mistakes smallint not null,
  hinted boolean not null,
  done boolean not null,
  failed boolean not null,
  started_at timestamptz not null,
  time_ms integer not null,
  primary key (user_id, date, level)
);

create table if not exists timer_plays (
  user_id bigint not null references users (id) on delete cascade,
  date date not null,
  ply smallint not null,
  tried jsonb not null default '[]',
  mistakes smallint not null,
  hinted boolean not null,
  done boolean not null,
  failed boolean not null,
  started_at timestamptz not null,
  ms integer not null,
  primary key (user_id, date)
);
