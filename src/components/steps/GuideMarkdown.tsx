import { useTranslations } from "next-intl";
import type { Block, Inline, List } from "@/lib/steps/markdown";

// Renders parsed guide markdown (see `parseMarkdown`). Every piece of text is
// a React child, so React escapes it; there is no HTML-string path.
export function GuideMarkdown({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-4 leading-relaxed">
      {blocks.map((block, index) => (
        <GuideBlock key={index} block={block} />
      ))}
    </div>
  );
}

function GuideBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return block.level === 2 ? (
        <h2 className="mt-4 text-xl font-semibold first:mt-0 lg:text-2xl">
          <InlineContent nodes={block.content} />
        </h2>
      ) : (
        <h3 className="mt-2 text-lg font-semibold first:mt-0">
          <InlineContent nodes={block.content} />
        </h3>
      );
    case "paragraph":
      return (
        <p>
          <InlineContent nodes={block.content} />
        </p>
      );
    case "list":
      return <GuideList list={block} />;
  }
}

function GuideList({ list, nested = false }: { list: List; nested?: boolean }) {
  const Tag = list.ordered ? "ol" : "ul";
  return (
    <Tag
      className={`space-y-2 pl-6 ${list.ordered ? "list-decimal" : "list-disc"} ${nested ? "mt-2" : ""}`}
    >
      {list.items.map((item, index) => (
        <li key={index} className="pl-1">
          <InlineContent nodes={item.content} />
          {item.lists.map((sublist, sublistIndex) => (
            <GuideList key={sublistIndex} list={sublist} nested />
          ))}
        </li>
      ))}
    </Tag>
  );
}

function InlineContent({ nodes }: { nodes: Inline[] }) {
  return nodes.map((node, index) => <InlineNode key={index} node={node} />);
}

function InlineNode({ node }: { node: Inline }) {
  const t = useTranslations("StepDetail");
  switch (node.type) {
    case "text":
      return node.text;
    case "strong":
      return (
        <strong className="font-semibold">
          <InlineContent nodes={node.children} />
        </strong>
      );
    case "link":
      return (
        <a
          href={node.href}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-target inline-flex items-center rounded-md font-medium text-primary underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {node.text}
          <span className="sr-only"> {t("opensInNewTab")}</span>
        </a>
      );
  }
}
