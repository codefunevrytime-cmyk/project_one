/**
 * Reusable dark banner shown at the top of the internal marketing pages.
 * The page passes in the title and subtitle so the same layout can be reused.
 */
export default function PageHeader({ title, subtitle }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}
