/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: {
      id: string;
      email: string;
      email_verified_at: Date | null;
      pending_email: string | null;
      profile_id: string;
      slug: string;
      display_name: string;
      suspended_at: Date | null;
      suspension_reason: string | null;
    } | null;
  }
}
