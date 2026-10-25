export default function DesignsLayout({ children }: LayoutProps<"/designs">) {
  return (
    <>
      <style>{"body > header, body > footer { display: none }"}</style>
      {children}
    </>
  );
}
