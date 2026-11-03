"use server";

import { redirect } from "next/navigation";
import { createAccount, findAccountCredentials } from "@/lib/accounts/accounts";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/auth/password";
import { endSession, startSession } from "@/lib/auth/session";
import { parseUsernameInput } from "@/lib/auth/username";
import { walletEncryptionKey } from "@/lib/config";
import { getDb } from "@/lib/db/connection";
import type { FormState } from "./form-state";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function signUp(_previous: FormState, formData: FormData): Promise<FormState> {
  const username = parseUsernameInput(readField(formData, "username"));
  if (!username.ok) return { status: "error", message: username.error };

  const password = readField(formData, "password");
  const passwordError = validatePassword(password);
  if (passwordError) return { status: "error", message: passwordError };

  const result = createAccount(getDb(), {
    username: username.username,
    passwordHash: await hashPassword(password),
    walletEncryptionKey: walletEncryptionKey(),
  });
  if (!result.ok) return { status: "error", message: `@${username.username} is taken. Try another.` };

  await startSession(result.userId);
  redirect("/trade");
}

const WRONG_CREDENTIALS: FormState = { status: "error", message: "Wrong username or password." };

export async function signIn(_previous: FormState, formData: FormData): Promise<FormState> {
  const username = parseUsernameInput(readField(formData, "username"));
  if (!username.ok) return WRONG_CREDENTIALS;

  const account = findAccountCredentials(getDb(), username.username);
  if (!account) return WRONG_CREDENTIALS;

  const valid = await verifyPassword(readField(formData, "password"), account.passwordHash);
  if (!valid) return WRONG_CREDENTIALS;

  await startSession(account.userId);
  redirect("/trade");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/");
}
