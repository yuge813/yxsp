-- Yuanxiang V150 real direct referral rewards.
-- Run only after owner review/preflight; replace ims_ with the deployment table prefix.
-- Existing user, qian, num_log and v11_relation_audit must all use InnoDB.
-- No active campaign is created by this migration.

CREATE TABLE IF NOT EXISTS `ims_sage_dksy_v150_referral_campaign` (
 id bigint unsigned NOT NULL AUTO_INCREMENT, uniacid int unsigned NOT NULL,
 name varchar(80) NOT NULL, enabled tinyint unsigned NOT NULL DEFAULT 0, public_visible tinyint unsigned NOT NULL DEFAULT 0,
 inviter_points int unsigned NOT NULL DEFAULT 10, invitee_points int unsigned NOT NULL DEFAULT 5,
 min_sign_days tinyint unsigned NOT NULL DEFAULT 2, window_days tinyint unsigned NOT NULL DEFAULT 7,
 starts_at int unsigned NOT NULL, ends_at int unsigned NOT NULL DEFAULT 0,
 daily_invite_cap int unsigned NOT NULL DEFAULT 10, daily_budget_coins bigint unsigned NOT NULL DEFAULT 0,
 total_budget_coins bigint unsigned NOT NULL DEFAULT 0, reserved_coins bigint unsigned NOT NULL DEFAULT 0,
 paid_coins bigint unsigned NOT NULL DEFAULT 0, created_by int unsigned NOT NULL DEFAULT 0,
 created_at int unsigned NOT NULL, updated_at int unsigned NOT NULL,
 PRIMARY KEY(id), KEY ix_tenant_active(uniacid,enabled,starts_at)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ims_sage_dksy_v150_referral_day` (
 id bigint unsigned NOT NULL AUTO_INCREMENT, uniacid int unsigned NOT NULL, campaign_id bigint unsigned NOT NULL,
 day_key int unsigned NOT NULL, reserved_coins bigint unsigned NOT NULL DEFAULT 0, paid_coins bigint unsigned NOT NULL DEFAULT 0,
 PRIMARY KEY(id), UNIQUE KEY uq_campaign_day(uniacid,campaign_id,day_key)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ims_sage_dksy_v150_referral_enrollment` (
 id bigint unsigned NOT NULL AUTO_INCREMENT, uniacid int unsigned NOT NULL, campaign_id bigint unsigned NOT NULL,
 referee_key char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 invitee_id int unsigned NOT NULL, invitee_openid varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 inviter_id int unsigned NOT NULL, inviter_openid varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 binding_audit_id bigint unsigned NOT NULL, registered_at int unsigned NOT NULL, register_day int unsigned NOT NULL,
 budget_day int unsigned NOT NULL, expires_at int unsigned NOT NULL,
 inviter_points int unsigned NOT NULL, invitee_points int unsigned NOT NULL, min_sign_days tinyint unsigned NOT NULL,
 window_days tinyint unsigned NOT NULL, signed_days tinyint unsigned NOT NULL DEFAULT 0,
 invitee_status varchar(24) NOT NULL DEFAULT 'waiting', inviter_status varchar(24) NOT NULL DEFAULT 'waiting',
 created_at int unsigned NOT NULL, updated_at int unsigned NOT NULL,
 PRIMARY KEY(id), UNIQUE KEY uq_lifetime_referee(uniacid,referee_key), UNIQUE KEY uq_binding(uniacid,binding_audit_id),
 KEY ix_inviter_day(uniacid,inviter_id,budget_day), KEY ix_invitee(uniacid,invitee_id),
 KEY ix_inviter_identity(uniacid,inviter_openid,budget_day), KEY ix_invitee_identity(uniacid,invitee_openid),
 KEY ix_expiry(uniacid,expires_at)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ims_sage_dksy_v150_referral_reward` (
 id bigint unsigned NOT NULL AUTO_INCREMENT, uniacid int unsigned NOT NULL, campaign_id bigint unsigned NOT NULL,
 enrollment_id bigint unsigned NOT NULL, referee_key char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 stage varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, beneficiary_id int unsigned NOT NULL,
 beneficiary_openid varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, coins int unsigned NOT NULL,
 ledger_log_id bigint unsigned NOT NULL, created_at int unsigned NOT NULL,
 PRIMARY KEY(id), UNIQUE KEY uq_lifetime_stage(uniacid,referee_key,stage), UNIQUE KEY uq_enrollment_stage(uniacid,enrollment_id,stage),
 UNIQUE KEY uq_ledger(uniacid,ledger_log_id), KEY ix_beneficiary(uniacid,beneficiary_id,id),
 KEY ix_beneficiary_identity(uniacid,beneficiary_openid,id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ims_sage_dksy_v150_referral_admin_audit` (
 id bigint unsigned NOT NULL AUTO_INCREMENT, uniacid int unsigned NOT NULL, actor_id int unsigned NOT NULL,
 action varchar(40) NOT NULL, campaign_id bigint unsigned NOT NULL DEFAULT 0, detail text NOT NULL,
 created_at int unsigned NOT NULL, PRIMARY KEY(id), KEY ix_tenant_time(uniacid,created_at)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
