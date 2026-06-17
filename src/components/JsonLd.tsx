// Emits one or more schema.org JSON-LD blocks for SEO/AEO. Server component.
export default function JsonLd({ data }: { data: object[] }) {
  return (
    <>
      {data.map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON.stringify output is safe to inline in a script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
        />
      ))}
    </>
  );
}
