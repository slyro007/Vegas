/** The only emails allowed into the site — enforced app-side on every signed-in request. */
export const FAMILY_EMAILS = [
  "dansol6@gmail.com", // Pithya
  "solomonrebecca@gmail.com", // Bex
  "shyannejohnsoncano@gmail.com", // Shy
  "kamakshi63@gmail.com", // Amma
];

export function isFamilyEmail(email: string): boolean {
  return FAMILY_EMAILS.includes(email.trim().toLowerCase());
}
