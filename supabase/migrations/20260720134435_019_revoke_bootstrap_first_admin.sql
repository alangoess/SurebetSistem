/*
# Revoke bootstrap_first_admin

## Overview
The first admin has been bootstrapped. Per the user's request, remove the
ability for anyone to self-promote to admin. Future admin promotions happen
only through the admin UI (protected by admin_update_all_profiles RLS policy,
which requires is_admin() = true).

## Security
- DROP the bootstrap function entirely. The guard inside it already refused
  to run once an admin existed, but removing it eliminates the attack surface.
*/

DROP FUNCTION IF EXISTS bootstrap_first_admin(text);