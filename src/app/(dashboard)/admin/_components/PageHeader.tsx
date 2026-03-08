interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div>
      <h1 className="text-[#155A03] text-[30px] font-semibold leading-9">
        {title}
      </h1>
      <p className="text-[#AAAAAA] text-base font-medium leading-6">
        {description}
      </p>
    </div>
  );
}
