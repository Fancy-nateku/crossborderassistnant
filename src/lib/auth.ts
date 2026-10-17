// Login method (phone OTP vs email) is not decided, so the UI depends only on this
// interface. The stub below stands in for Auth.js until the backend owns it.

export interface Session {
  /** What the header shows: a phone number or an email address. */
  identifier: string;
}

export async function getSession(): Promise<Session | null> {
  return { identifier: "07XX XXX XXX" };
}
