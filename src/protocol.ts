/**
 * Parsing for inbound client messages.
 *
 * The client always sends `<command>\n<body>` (src/client/comm.ts). The body
 * may contain any characters, including spaces and newlines (chat messages),
 * so only the first newline delimits the command.
 */
export function parseClientMessage(raw: string): {
  cmd: string;
  body: string;
} {
  const newlineIndex = raw.indexOf("\n");
  if (newlineIndex === -1) {
    return { cmd: raw.trim(), body: "" };
  }
  return {
    cmd: raw.slice(0, newlineIndex).trim(),
    body: raw.slice(newlineIndex + 1),
  };
}
