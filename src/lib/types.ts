import { z } from "zod";

export type Section = { id: string; type: string; description: string };
export type Page = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sections: Section[];
};
export type Tree = { pages: Page[] };

export type CommentRow = {
  id: string;
  project_id: string;
  page_id: string;
  section_id: string | null;
  parent_id: string | null;
  author_name: string;
  body: string;
  by_owner: boolean;
  resolved: boolean;
  created_at: string;
};

export type CommentTarget = { pageId: string; sectionId: string | null };

/** What the editor needs to open a project. */
export type ProjectFull = { id: string; name: string; tree: Tree; share_token: string; share_enabled: boolean };
/** One row in the Projects menu. */
export type ProjectSummary = { id: string; name: string; updated_at: string };

/** Section types the generator is steered towards. Free text is still allowed in the editor. */
export const SECTION_TYPES = [
  "Navbar",
  "Hero Header",
  "Header",
  "Logo List",
  "Feature",
  "Features List",
  "About",
  "Team",
  "Gallery",
  "Comparison",
  "Pricing",
  "Testimonial",
  "Stats",
  "Timeline",
  "Blog List",
  "FAQ",
  "Contact",
  "CTA",
  "CTA Form",
  "Footer",
] as const;

/** What the model returns. Parents are referenced by slug; ids are assigned afterwards. */
export const GeneratedSitemapSchema = z.object({
  pages: z.array(
    z.object({
      name: z.string(),
      slug: z.string(),
      parent_slug: z.string().nullable(),
      sections: z.array(z.object({ type: z.string(), description: z.string() })),
    }),
  ),
});
export type GeneratedSitemap = z.infer<typeof GeneratedSitemapSchema>;

/** Validates a tree arriving from the database or the editor. */
export const TreeSchema = z.object({
  pages: z
    .array(
      z.object({
        id: z.string().max(64),
        name: z.string().max(200),
        slug: z.string().max(200),
        parentId: z.string().max(64).nullable(),
        sections: z.array(
          z.object({
            id: z.string().max(64),
            type: z.string().max(100),
            description: z.string().max(2000),
          }),
        ),
      }),
    )
    .max(200),
});
