import type { FeaturedPostSection } from "../../../../src/types/homepage-sections";
import { fetchFeaturedPost, fetchPostById } from "../../../../src/lib/queries/posts";
import { FeaturedCard } from "../HomeView";

export async function FeaturedPostRenderer({ section }: { section: FeaturedPostSection }) {
  const post =
    section.postId === "auto"
      ? await fetchFeaturedPost()
      : await fetchPostById(section.postId as number);

  if (!post) return null;

  return <FeaturedCard post={post} showExcerpt={section.showExcerpt} />;
}
