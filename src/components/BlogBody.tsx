import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

// Renders a blog post's markdown body with the site's typography. Internal
// links use next/link; markdown "#" maps to H2 so the page H1 stays unique.
export default function BlogBody({ markdown }: { markdown: string }) {
  return (
    <div className="article">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 className="article__h2">{children}</h2>,
          h2: ({ children }) => <h2 className="article__h2">{children}</h2>,
          h3: ({ children }) => <h3 className="article__h3">{children}</h3>,
          a: ({ href, children }) => {
            const url = href ?? "#";
            if (url.startsWith("/")) return <Link href={url}>{children}</Link>;
            return <a href={url} target="_blank" rel="noopener noreferrer">{children}</a>;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          table: ({ children }) => <div className="article__tablewrap"><table>{children}</table></div>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
