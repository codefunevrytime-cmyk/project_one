import { useState } from "react";
import { Link } from "react-router-dom";
import { BookmarkIcon } from "./BookmarkIcon";
import "./CommonControls.css";

export function SearchBar({
  value,
  onChange,
  placeholder,
  hint,
  onClear,
  className = "",
  iconClassName = "",
  inputClassName = "",
  clearClassName = "",
  type = "text",
}) {
  const hasValue = Boolean(value);

  return (
    <div className={`common-search ${className}`}>
      <span className={`common-search-icon ${iconClassName}`} aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="6.5" cy="6.5" r="5" />
          <path d="M11 11l3 3" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`common-search-input ${inputClassName}`}
      />
      {!hasValue && hint ? <span className="common-search-hint">{hint}</span> : null}
      {hasValue && onClear ? (
        <button type="button" className={`common-search-clear ${clearClassName}`} onClick={onClear} aria-label="Clear search">
          x
        </button>
      ) : null}
    </div>
  );
}

export function FilterPanel({
  title = "Filters",
  activeCount = 0,
  onClear,
  clearLabel = "Clear all",
  children,
  className = "",
  headerClassName = "",
  titleClassName = "",
  countClassName = "",
  clearClassName = "",
}) {
  return (
    <aside className={`common-filter-panel ${className}`}>
      <div className={`common-filter-header ${headerClassName}`}>
        <span className={`common-filter-title ${titleClassName}`}>
          {title}
          {activeCount > 0 ? <span className={`common-filter-count ${countClassName}`}>{activeCount}</span> : null}
        </span>
        {onClear ? (
          <button type="button" className={`common-filter-clear ${clearClassName}`} onClick={onClear}>
            {clearLabel}
          </button>
        ) : null}
      </div>
      {children}
    </aside>
  );
}

export function FilterSection({
  title,
  children,
  defaultOpen = true,
  collapsible = true,
  className = "",
  titleClassName = "",
  bodyClassName = "",
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!collapsible) {
    return (
      <div className={`common-filter-section ${className}`}>
        <div className={`common-filter-section-title ${titleClassName}`}>{title}</div>
        <div className={bodyClassName}>{children}</div>
      </div>
    );
  }

  return (
    <div className={`common-filter-section ${className}`}>
      <button
        type="button"
        className={`common-filter-section-title common-filter-section-toggle ${titleClassName}`}
        onClick={() => setOpen((current) => !current)}
      >
        {title}
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? <div className={`common-filter-body ${bodyClassName}`}>{children}</div> : null}
    </div>
  );
}

export function FilterOption({
  label,
  count,
  checked,
  onChange,
  type = "checkbox",
  name,
  value,
  variant = "row",
  className = "",
  inputClassName = "",
  labelClassName = "",
  countClassName = "",
  children,
}) {
  return (
    <label className={`common-filter-option common-filter-option-${variant} ${checked ? "is-checked" : ""} ${className}`}>
      <input
        type={type}
        name={name}
        value={value ?? label}
        checked={checked}
        onChange={onChange}
        className={inputClassName}
      />
      {children ?? <span className={labelClassName}>{label}</span>}
      {count !== undefined ? <span className={countClassName}>{count}</span> : null}
    </label>
  );
}

export function BookmarkButton({
  active,
  onClick,
  visible = true,
  size = 32,
  iconSize = 15,
  activeColor = "rgba(201,168,76,0.88)",
  idleColor = "rgba(0,0,0,0.52)",
  hoverColor = "rgba(0,0,0,0.72)",
  iconColor = "#fff",
  className = "",
  style,
  title,
}) {
  const [hovered, setHovered] = useState(false);
  const background = active ? activeColor : hovered ? hoverColor : idleColor;

  return (
    <button
      type="button"
      className={`common-bookmark-button ${className}`}
      style={{
        width: size,
        height: size,
        opacity: visible || active ? 1 : 0,
        background,
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title ?? (active ? "Remove bookmark" : "Save")}
      aria-label={active ? "Remove bookmark" : "Save"}
      aria-pressed={active}
    >
      <BookmarkIcon filled={active} size={iconSize} color={iconColor} />
    </button>
  );
}

export function BookmarkMenuItem({ count = 0, to = "/bookmarks", onClick, label = "Bookmarked", className = "" }) {
  return (
    <LinkLike to={to} className={`common-bookmark-menu-item ${className}`} onClick={onClick}>
      <span className="cd-icon">
        <BookmarkIcon filled={count > 0} size={16} color="currentColor" />
      </span>
      {label}
      <span className="nav-count-badge">{count}</span>
    </LinkLike>
  );
}

function LinkLike({ to, className, onClick, children }) {
  if (typeof to === "string") {
    return (
      <Link to={to} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}
