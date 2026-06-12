type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="mb-5">
      {eyebrow ? <p className="mb-2 text-sm font-bold text-[#0b6b43]">{eyebrow}</p> : null}
      <h2 className="text-2xl font-extrabold tracking-normal text-[#16231d] md:text-3xl">{title}</h2>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067] md:text-base">{description}</p> : null}
    </div>
  );
}
