-- Table for persistent rate limiting across Edge Function cold starts
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id          bigserial PRIMARY KEY,
  key         text        NOT NULL,
  window_start timestamptz NOT NULL,
  count       integer     NOT NULL DEFAULT 1,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rate_limit_log_key_window_idx
  ON rate_limit_log (key, window_start);

CREATE INDEX IF NOT EXISTS rate_limit_log_key_idx
  ON rate_limit_log (key);

-- Auto-cleanup: delete entries older than 1 hour
CREATE OR REPLACE FUNCTION cleanup_rate_limit_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM rate_limit_log
  WHERE window_start < now() - interval '1 hour';
$$;

-- SECURITY DEFINER function so Edge Functions (anon key) can read/write rate limits
-- without needing full table access
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_key         text,
  p_window_ms   integer,
  p_max_requests integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start  timestamptz;
  v_count         integer;
  v_allowed       boolean;
  v_remaining     integer;
  v_retry_after_ms bigint;
BEGIN
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) * 1000 / p_window_ms) * p_window_ms / 1000
  );

  INSERT INTO rate_limit_log (key, window_start, count, updated_at)
  VALUES (p_key, v_window_start, 1, now())
  ON CONFLICT (key, window_start)
  DO UPDATE SET
    count      = rate_limit_log.count + 1,
    updated_at = now()
  RETURNING count INTO v_count;

  v_allowed   := v_count <= p_max_requests;
  v_remaining := GREATEST(0, p_max_requests - v_count);
  v_retry_after_ms := CASE
    WHEN NOT v_allowed THEN
      (p_window_ms - (extract(epoch from now()) * 1000)::bigint % p_window_ms)
    ELSE NULL
  END;

  IF random() < 0.01 THEN
    PERFORM cleanup_rate_limit_log();
  END IF;

  RETURN jsonb_build_object(
    'allowed',        v_allowed,
    'remaining',      v_remaining,
    'count',          v_count,
    'retry_after_ms', v_retry_after_ms
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_and_increment_rate_limit(text, integer, integer) TO anon, service_role;

ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;
