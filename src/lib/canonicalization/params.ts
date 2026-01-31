/**
 * Tracking Parameters to Strip from URLs
 *
 * These parameters are used for tracking/analytics and should be removed
 * during canonicalization to ensure consistent URL matching.
 */

export const PARAMS_TO_STRIP = [
  // UTM parameters (Google Analytics campaign tracking)
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_creative",

  // Social media / ad platform click IDs
  "fbclid", // Facebook
  "gclid", // Google Ads
  "gclsrc", // Google Ads source
  "msclkid", // Microsoft Ads
  "twclid", // Twitter
  "li_fat_id", // LinkedIn
  "dclid", // DoubleClick
  "yclid", // Yandex
  "ttclid", // TikTok
  "sccid", // Snapchat
  "igshid", // Instagram

  // Email platforms
  "mc_cid", // Mailchimp campaign ID
  "mc_eid", // Mailchimp email ID
  "ck_subscriber_id", // ConvertKit
  "email_subscriber_id",
  "subscriber_id",
  "user_id",
  "uid",
  "_bta_tid", // Bronto
  "_bta_c",
  "trk_contact", // HubSpot
  "trk_msg",
  "trk_module",
  "trk_sid",

  // Analytics / tracking
  "_ga", // Google Analytics
  "_gl", // Google Linker
  "_hsenc", // HubSpot
  "_hsmi", // HubSpot
  "ref",
  "referer",
  "referrer",
  "source",
  "src",
  "trk",
  "srid",
  "_openstat", // Yandex.Metrica

  // Marketing / attribution
  "mkt_tok", // Marketo
  "ncid",
  "sr_share",
  "share_bandit_exp",
  "share_bandit_var",
  "share_source",
  "shareuid",
  "affiliate",
  "affiliate_id",
  "partner",
  "partner_id",
  "campaign",
  "campaign_id",

  // Newsletter-specific
  "email",
  "subscriber",
  "hash",
  "token",
  "sid",
  "eid",
  "mid",

  // Misc tracking
  "s_kwcid", // Adobe Analytics
  "s_cid",
  "ef_id",
  "zanpid", // Zanox
  "kclickid",
  "__s", // Drip
  "_ke", // Klaviyo
  "vgo_ee",
  "vero_id",
  "nr_email_referer",
  "spm", // Alibaba
  "scm",

  // NYTimes specific
  "smid",
  "smtyp",

  // Additional misc
  "isFreemail",
  "publication_id",
];

/**
 * Parameters that should be preserved during canonicalization
 * (important for content identification)
 */
export const PARAMS_TO_PRESERVE = [
  "id",
  "p", // WordPress post ID
  "page",
  "v", // YouTube video ID
  "q", // Search query
  "s", // Search (WordPress)
  "t", // Time/timestamp in video
  "tab",
  "section",
  "anchor",
];
