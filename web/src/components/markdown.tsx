import type { ReactNode } from "react";

// The few blocks the briefing uses: headings, paragraphs, bulleted and numbered lists, with **bold**.
// Rendered as elements, never as HTML, so nothing in the text can inject markup.
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={blocks.length}>{inline(paragraph.join(" "))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((item, index) => <li key={index}>{inline(item)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={blocks.length} className="list-decimal pl-5">
          {items}
        </ol>
      ) : (
        <ul key={blocks.length} className="list-disc pl-5 marker:text-ink-dim">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const Tag = (["h3", "h4", "h5"] as const)[heading[1].length - 1];
      const style =
        heading[1].length === 1 ? "font-display text-2xl leading-none font-semibold" : "tag mt-2 text-ink-dim";
      blocks.push(
        <Tag key={blocks.length} className={style}>
          {inline(heading[2])}
        </Tag>,
      );
    } else if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (line) {
      flushList();
      paragraph.push(line);
    } else {
      flushParagraph();
      flushList();
    }
  }
  flushParagraph();
  flushList();
  return <div className="flex flex-col gap-3">{blocks}</div>;
}

function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
    );
}
