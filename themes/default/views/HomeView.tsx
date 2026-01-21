import Link from 'next/link';

interface Post {
  id: number;
  title: string;
  excerpt: string;
  slug: string;
}

export default function HomeView({ posts }: { posts: Post[] }) {
  return (
    <div className="space-y-12">
      <header className="border-b pb-8">
        <h1 className="text-4xl font-bold tracking-tight">Latest Stories</h1>
        <p className="mt-2 text-slate-500">Welcome to my ReplPress site.</p>
      </header>

      <div className="grid gap-8">
        {posts.map((post) => (
          <article key={post.id} className="group">
            <Link href={`/post/${post.slug}`}>
              <h2 className="text-2xl font-semibold group-hover:text-blue-600 transition">
                {post.title}
              </h2>
            </Link>
            <p className="mt-2 text-slate-600 line-clamp-3">{post.excerpt}</p>
            <Link 
              href={`/post/${post.slug}`}
              className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              Read more →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
