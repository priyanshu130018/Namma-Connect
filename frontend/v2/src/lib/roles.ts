export type Role = "tourist" | "farmer" | "creator" | "admin";

/** Wrapper class that switches the `role` accent tokens for a subtree. */
export function roleClass(role?: string | null) {
  switch (role) {
    case "farmer":
      return "role-farmer";
    case "creator":
      return "role-creator";
    case "admin":
      return "role-admin";
    case "tourist":
      return "role-tourist";
    default:
      return "";
  }
}

export const roleLabel: Record<Role, string> = {
  tourist: "Tourist",
  farmer: "Farmer",
  creator: "Creator",
  admin: "Admin",
};
