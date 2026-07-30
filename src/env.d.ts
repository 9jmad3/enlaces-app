/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: {
      id: string;
      email: string;
      profile_id: string;
      slug: string;
      display_name: string;
    } | null;
  }
}
