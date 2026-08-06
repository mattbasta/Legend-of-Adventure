/**
 * Sanitizer for server-supplied markup.
 *
 * Chat bodies are relayed from other players, so they are untrusted: the
 * player controls the text, and NPC speech wraps a nametag in markup. Rather
 * than pattern-matching the one shape we expect today, parse the markup and
 * walk it, keeping only an explicit allowlist of elements and attributes.
 * Anything else is unwrapped to its text, so new server-side markup degrades
 * to plain text instead of becoming an injection point.
 */

/** Element tag names (uppercase) that may survive sanitization. */
const ALLOWED_TAGS = new Set(["SPAN"]);

/** Attributes allowed per tag, with the values each may take. */
const ALLOWED_ATTRIBUTES: Record<string, Record<string, Set<string>>> = {
  SPAN: { class: new Set(["nametag"]) },
};

export function sanitizeToFragment(markup: string): DocumentFragment {
  // A <template>'s content belongs to an inert document: parsing here runs
  // no scripts and fetches no resources, even for markup we are about to
  // throw away.
  const template = document.createElement("template");
  template.innerHTML = markup;

  const walker = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_ELEMENT,
  );

  // Collect first, mutate after: editing the tree mid-walk invalidates the
  // walker's position.
  const disallowed: Array<Element> = [];
  while (walker.nextNode()) {
    const element = walker.currentNode as Element;
    if (!ALLOWED_TAGS.has(element.tagName)) {
      disallowed.push(element);
      continue;
    }
    const allowedForTag = ALLOWED_ATTRIBUTES[element.tagName] ?? {};
    for (const attribute of [...element.attributes]) {
      const permittedValues = allowedForTag[attribute.name];
      if (!permittedValues?.has(attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    }
  }

  // Unwrap rather than delete, so text inside a disallowed element (and any
  // allowed elements nested within it) survives as content.
  for (const element of disallowed) {
    element.replaceWith(...element.childNodes);
  }

  return template.content;
}
