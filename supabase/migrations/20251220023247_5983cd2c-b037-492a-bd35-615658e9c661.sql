-- Fix critical vulnerability: prevent users from updating their own token balances directly

BEGIN;

-- 1) Remove the unsafe self-update policy (users should never be able to UPDATE balances directly)
DROP POLICY IF EXISTS "Users can update their own tokens" ON public.user_tokens;

-- 2) Create a secure withdrawal request function that performs all writes server-side
--    - validates amount
--    - enforces rate limit
--    - ensures sufficient available balance
--    - creates withdrawal_requests row
--    - moves balance into pending_withdrawal
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_payment_method text,
  p_payment_email text,
  p_additional_info text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_pending numeric;
  v_request_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Basic input validation
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  -- Keep the same business rule enforced in the UI
  IF p_amount > 10000 THEN
    RAISE EXCEPTION 'Amount exceeds maximum';
  END IF;

  IF p_payment_method IS NULL OR btrim(p_payment_method) = '' THEN
    RAISE EXCEPTION 'Payment method is required';
  END IF;

  IF p_payment_email IS NULL OR btrim(p_payment_email) = '' THEN
    RAISE EXCEPTION 'Payment email is required';
  END IF;

  -- Rate limit (max 3 per hour)
  IF NOT public.check_withdrawal_rate_limit(v_user_id) THEN
    RAISE EXCEPTION 'Rate limit exceeded';
  END IF;

  -- Lock token row to prevent race conditions
  SELECT COALESCE(balance_usd, 0), COALESCE(pending_withdrawal, 0)
    INTO v_balance, v_pending
  FROM public.user_tokens
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token account not found';
  END IF;

  -- Prevent stacking multiple withdrawals
  IF v_pending > 0 THEN
    RAISE EXCEPTION 'Existing pending withdrawal';
  END IF;

  -- Enforce available balance
  IF p_amount > v_balance THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Optional: enforce minimum withdrawal amount consistent with UI ($25)
  IF p_amount < 25 THEN
    RAISE EXCEPTION 'Minimum withdrawal amount not met';
  END IF;

  INSERT INTO public.withdrawal_requests (
    user_id,
    amount,
    payment_method,
    payment_email,
    additional_info,
    status
  ) VALUES (
    v_user_id,
    p_amount,
    p_payment_method,
    p_payment_email,
    p_additional_info,
    'pending'
  ) RETURNING id INTO v_request_id;

  UPDATE public.user_tokens
  SET
    balance_usd = v_balance - p_amount,
    pending_withdrawal = v_pending + p_amount,
    updated_at = now()
  WHERE user_id = v_user_id;

  RETURN v_request_id;
END;
$$;

-- 3) Make sure regular users cannot update user_tokens at all.
--    Keep Admin update policy (already exists).

COMMIT;