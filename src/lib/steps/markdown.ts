// Tiny markdown parser for step guides stored in the database. It knows only
// headings, paragraphs, lists (one nested level), **bold** and https links;
// everything else stays literal text. It returns plain data, never HTML, so
// the renderer hands all text to React as escaped children.

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "link"; href: string; text: string };

export type ListItem = { content: Inline[]; lists: List[] };

export type List = { type: "list"; ordered: boolean; items: ListItem[] };

export type Block =
  | { type: "heading"; level: 2 | 3; content: Inline[] }
  | { type: "paragraph"; content: Inline[] }
  | List;

// Only an absolute https: URL becomes a link target.
export function safeHref(url: string): string | null {
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

// Caps the url scan so a long hostile line can't make parsing quadratic.
const maxUrlLength = 2048;

// `[text](url)` starting at `start`, allowing balanced parentheses in the url.
function matchLink(source: string, start: number) {
  let close = start + 1;
  while (
    close < source.length &&
    source[close] !== "]" &&
    source[close] !== "["
  ) {
    close++;
  }
  if (
    close === start + 1 ||
    source[close] !== "]" ||
    source[close + 1] !== "("
  ) {
    return null;
  }
  const urlStart = close + 2;
  const urlEnd = Math.min(source.length, urlStart + maxUrlLength);
  let depth = 0;
  for (let i = urlStart; i < urlEnd; i++) {
    if (source[i] === "(") depth++;
    else if (source[i] === ")") {
      if (depth === 0) {
        return {
          text: source.slice(start + 1, close),
          url: source.slice(urlStart, i),
          end: i + 1,
        };
      }
      depth--;
    }
  }
  return null;
}

function pushText(nodes: Inline[], text: string) {
  const last = nodes.at(-1);
  if (last?.type === "text") last.text += text;
  else nodes.push({ type: "text", text });
}

// Bold text may contain links but not more bold. A link that isn't https
// keeps only its text.
export function parseInline(source: string, allowStrong = true): Inline[] {
  const nodes: Inline[] = [];
  let i = 0;
  while (i < source.length) {
    if (allowStrong && source.startsWith("**", i)) {
      const end = source.indexOf("**", i + 2);
      if (end > i + 2) {
        nodes.push({
          type: "strong",
          children: parseInline(source.slice(i + 2, end), false),
        });
        i = end + 2;
        continue;
      }
    }
    if (source[i] === "[") {
      const link = matchLink(source, i);
      if (link) {
        const href = safeHref(link.url);
        if (href) nodes.push({ type: "link", href, text: link.text });
        else pushText(nodes, link.text);
        i = link.end;
        continue;
      }
    }
    // Plain text up to the next character that could start markup.
    let next = i + 1;
    while (
      next < source.length &&
      source[next] !== "[" &&
      !(allowStrong && source.startsWith("**", next))
    ) {
      next++;
    }
    pushText(nodes, source.slice(i, next));
    i = next;
  }
  return nodes;
}

const headingPattern = /^(#{1,6})\s+(.*)$/;
const listItemPattern = /^( *)([-*]|\d+\.)\s+(.*)$/;

type OpenItem = { item: ListItem; lines: string[] };

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: List | null = null;
  // Items of the open list in document order; the last one takes
  // continuation lines. Their inline content is parsed when the list closes.
  let openItems: OpenItem[] = [];

  function closeParagraph() {
    if (paragraph.length > 0) {
      blocks.push({
        type: "paragraph",
        content: parseInline(paragraph.join(" ")),
      });
    }
    paragraph = [];
  }

  function closeList() {
    for (const { item, lines } of openItems) {
      item.content = parseInline(lines.join(" "));
    }
    openItems = [];
    list = null;
  }

  function addItem(items: ListItem[], text: string) {
    const item: ListItem = { content: [], lists: [] };
    items.push(item);
    openItems.push({ item, lines: [text] });
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line === "") {
      closeParagraph();
      closeList();
      continue;
    }

    const heading = headingPattern.exec(rawLine.trimEnd());
    if (heading) {
      closeParagraph();
      closeList();
      blocks.push({
        type: "heading",
        level: heading[1].length <= 2 ? 2 : 3,
        content: parseInline(heading[2].trim()),
      });
      continue;
    }

    const listItem = listItemPattern.exec(rawLine.trimEnd());
    if (listItem) {
      closeParagraph();
      const [, indent, marker, text] = listItem;
      const ordered = marker !== "-" && marker !== "*";
      const parent = list?.items.at(-1);
      if (indent.length >= 2 && parent) {
        let nested = parent.lists.at(-1);
        if (!nested || nested.ordered !== ordered) {
          nested = { type: "list", ordered, items: [] };
          parent.lists.push(nested);
        }
        addItem(nested.items, text.trim());
      } else {
        if (!list || list.ordered !== ordered) {
          closeList();
          list = { type: "list", ordered, items: [] };
          blocks.push(list);
        }
        addItem(list.items, text.trim());
      }
      continue;
    }

    // Any other line continues the open list item or paragraph.
    const open = openItems.at(-1);
    if (open) open.lines.push(line);
    else paragraph.push(line);
  }
  closeParagraph();
  closeList();
  return blocks;
}
