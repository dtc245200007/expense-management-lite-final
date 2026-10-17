#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_EXPORTER_PASSWORD:?POSTGRES_EXPORTER_PASSWORD is required}"

psql \
    --no-psqlrc \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --set=ON_ERROR_STOP=1 \
    --set=monitor_password="$POSTGRES_EXPORTER_PASSWORD" \
    --set=db_name="$POSTGRES_DB" <<'SQL'
BEGIN;

SELECT 'CREATE ROLE expense_monitor LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION'
WHERE NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'expense_monitor'
)
\gexec

ALTER ROLE expense_monitor PASSWORD :'monitor_password';

GRANT pg_monitor TO expense_monitor;
GRANT CONNECT ON DATABASE :"db_name" TO expense_monitor;

COMMIT;
SQL

echo "PostgreSQL monitoring role configured."
