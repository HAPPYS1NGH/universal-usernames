"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { AVATAR_PHOTO_MAX_BYTES, checkAvatarPhoto, checkEmojiAvatar } from "@/lib/avatars/avatar-rules";
import { clearAvatar, saveAvatarPhoto, saveEmojiAvatar } from "@/lib/avatars/avatar-store";
import { getDb } from "@/lib/db/connection";
import type { FormState } from "./form-state";

const SIGNED_OUT: FormState = { status: "error", message: "Sign in to change your avatar." };

// Every page shows avatars, so refresh them all after a change.
function saved(message: string): FormState {
  revalidatePath("/", "layout");
  return { status: "success", message };
}

export async function chooseEmojiAvatar(emoji: string, color: string): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;

  const checked = checkEmojiAvatar(emoji, color);
  if (!checked.ok) return { status: "error", message: checked.error };

  saveEmojiAvatar(getDb(), user.id, checked.value);
  return saved("Avatar saved.");
}

export async function uploadAvatarPhoto(formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;

  const file = formData.get("photo");
  if (!(file instanceof File)) return { status: "error", message: "Choose a photo to upload." };
  // Checked before reading, so an oversized upload is never buffered twice.
  if (file.size > AVATAR_PHOTO_MAX_BYTES) {
    return { status: "error", message: "That photo is over 512 KB. Choose a smaller one." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = checkAvatarPhoto(bytes);
  if (!checked.ok) return { status: "error", message: checked.error };

  saveAvatarPhoto(getDb(), user.id, { bytes, type: checked.value.type });
  return saved("Avatar saved.");
}

export async function resetAvatar(): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;

  clearAvatar(getDb(), user.id);
  return saved("Avatar reset.");
}
