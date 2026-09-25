// PageHeader -- the title block at the top of Map / Reports / News / Events.
export default function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="page-header">
      {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
      <h1 className="page-header__title">{title}</h1>
      {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
      {children ? <div className="page-header__extra">{children}</div> : null}
    </div>
  )
}
