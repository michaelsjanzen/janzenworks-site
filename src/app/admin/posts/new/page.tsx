import PostForm from "@/components/editor/PostForm";
import { createPost } from "@/lib/actions/posts";
import { db } from "@/lib/db";
import { categories, tags, posts, media } from "@/lib/db/schema";
import { eq, like, desc } from "drizzle-orm";
import { isAiConfigured } from "@/lib/ai";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const defaultType = type === "page" ? "page" : "post";

  const [allCategories, allTags, allPages, aiEnabled, allMedia] = await Promise.all([
    db.select().from(categories).orderBy(categories.name),
    db.select().from(tags).orderBy(tags.name),
    db.select({ id: posts.id, title: posts.title })
      .from(posts)
      .where(eq(posts.type, "page"))
      .orderBy(posts.title),
    isAiConfigured(),
    db.select({ id: media.id, url: media.url, fileName: media.fileName, altText: media.altText })
      .from(media)
      .where(like(media.fileType, "image/%"))
      .orderBy(desc(media.createdAt)),
  ]);

  return (
    <PostForm
      mode="create"
      action={createPost}
      aiEnabled={aiEnabled}
      initialType={defaultType}
      initialPublishAt=""
      allCategories={allCategories}
      allTags={allTags}
      allPages={allPages}
      allMedia={allMedia}
    />
  );
}
