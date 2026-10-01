import { ShoppingBag } from "lucide-react";

type Props = {
  name: string;
  imageUrl?: string | null;
  className?: string;
  iconClassName?: string;
};

export function ProductCatalogImage({
  name,
  imageUrl,
  className = "h-28 w-full rounded-[12px]",
  iconClassName = "h-10 w-10 rounded-[12px]",
}: Props) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={`${className} bg-[var(--surface-muted)] object-cover ring-1 ring-inset ring-[var(--line)]`}
        loading="lazy"
      />
    );
  }

  return (
    <span
      className={`flex items-center justify-center bg-[var(--surface-muted)] text-[var(--faint)] ring-1 ring-inset ring-[var(--line)] ${iconClassName}`}
      aria-hidden
    >
      <ShoppingBag className="h-5 w-5" />
    </span>
  );
}
