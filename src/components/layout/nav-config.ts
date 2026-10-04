export type ShellUser = {
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  role?: "USER" | "ADMIN" | "SUPER_ADMIN" | string | null;
};

export type NavLink = { href: string; label: string; description?: string };

/**
 * Primary navigation. PYQs/Notes deep-link with `?type=` — the type filter currently lives on
 * semester pages; /resources ignores unknown params, so these land on /resources until Browse
 * wires the filter there.
 */
export const mainNav: readonly NavLink[] = [
  { href: "/resources", label: "Resources" },
  { href: "/resources#programs-h", label: "Programs" },
  { href: "/resources?type=PYQ", label: "PYQs" },
  { href: "/resources?type=NOTES", label: "Notes" },
];

export const toolsNav: readonly NavLink[] = [
  { href: "/calculator", label: "SCGPA Calculator", description: "Work out your semester GPA" },
  { href: "/my-requests", label: "Request a resource", description: "Ask for notes or papers we don't have yet" },
  { href: "/my-uploads", label: "Upload notes", description: "Share your notes with other students" },
];

/** Secondary links shown in the mobile sheet. */
export const moreNav: readonly NavLink[] = [
  { href: "/premium", label: "Premium" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/** Search shortcuts shown in the command palette. Each runs a real search. */
export const popularSearches = ["Computer Programming", "Mathematics I", "Data Structure", "Computer Networks"] as const;
