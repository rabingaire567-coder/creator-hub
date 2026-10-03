import { Fragment, type ReactNode } from "react";

/**
 * Minimal markdown renderer for article bodies. Supports:
 * # headings, paragraphs, > blockquotes, - / 1. lists, ``` code fences,
 * **bold**, *italic*, `code`, [links](url) — deliberately small, no deps.
 */

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        nodes.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkMatch[1]}
          </a>,
        );
      }
    } else {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let code: string[] | null = null;
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(<p key={`p${key++}`}>{renderInline(paragraph.join(" "))}</p>);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((item, index) => (
        <li key={index}>{renderInline(item)}</li>
      ));
      blocks.push(
        list.ordered ? <ol key={`l${key++}`}>{items}</ol> : <ul key={`l${key++}`}>{items}</ul>,
      );
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote.length > 0) {
      blocks.push(
        <blockquote key={`q${key++}`}>{renderInline(quote.join(" "))}</blockquote>,
      );
      quote = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (code) {
      if (line.startsWith("```")) {
        blocks.push(
          <pre key={`c${key++}`}>
            <code>{code.join("\n")}</code>
          </pre>,
        );
        code = null;
      } else {
        code.push(rawLine);
      }
      continue;
    }
    if (line.startsWith("```")) {
      flushAll();
      code = [];
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      const content = renderInline(heading[2]);
      const cls = "";
      if (level === 1) blocks.push(<h2 key={key++}>{content}</h2>);
      else if (level === 2) blocks.push(<h3 key={key++}>{content}</h3>);
      else if (level === 3) blocks.push(<h4 key={key++}>{content}</h4>);
      else blocks.push(<h4 key={key++} className={cls}>{content}</h4>);
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      flushList();
      quote.push(line.replace(/^>\s?/, ""));
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (bullet || ordered) {
      flushParagraph();
      flushQuote();
      const isOrdered = Boolean(ordered);
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push((bullet ?? ordered)![1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  if (code) {
    blocks.push(
      <pre key={`c${key++}`}>
        <code>{code.join("\n")}</code>
      </pre>,
    );
  }
  flushAll();

  return <Fragment>{blocks}</Fragment>;
}
