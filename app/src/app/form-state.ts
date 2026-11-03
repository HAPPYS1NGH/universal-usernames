// Shape returned by server actions to the forms that call them.
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const IDLE_FORM_STATE: FormState = { status: "idle" };
