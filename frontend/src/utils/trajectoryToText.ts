// trajectoryToText.ts
// ---------------------------------------------------------------------------
// Format conversion for trajectory analysis.
//
// Turns a raw agent trajectory into a readable plain-text transcript that
// MindCoder's existing coding pipeline can treat as a normal document.
// This is a TypeScript port of the parsing stage of the
// `human-trace-qualitative-analyst` skill (parse_chat_trajectory.py): it
// reconstructs human prompts as first-class events and agent work as
// (observation, thought, action) turns. The skill's annotation/render stages
// are intentionally NOT ported — MindCoder runs its own analysis logic.
//
// Supported inputs (auto-detected):
//   1. Claude Code native session log (.jsonl — one event per line)
//   2. A JSON array of the same events
//   3. A pre-parsed skeleton object: { turns: [...] }
//
// Returns the transcript string, or null when the content does not look like a
// trajectory (the caller then keeps the original file unchanged).
// ---------------------------------------------------------------------------

interface ToolUse {
  name?: string;
  input?: Record<string, any>;
}

interface InteractionEvent {
  kind: "interaction";
  id: string;
  actor: string;
  text: string;
}

interface AgentTurn {
  n: number;
  obs: string;
  thought: string;
  action: string;
}

type TranscriptItem = InteractionEvent | AgentTurn;

const OBS_LIMIT = 700;

// Render a single tool_use block as a one-line (or short multi-line) action surface.
function makeToolSurface(strip: (s: string) => string) {
  return (tu: ToolUse): string => {
    const name = tu.name;
    const inp = tu.input || {};
    if (name === "Bash") return "$ " + String(inp.command ?? "").trim();
    if (name === "Grep" || name === "Glob") {
      const pat = inp.pattern ?? "";
      const path = strip(String(inp.path ?? ""));
      return `${name.toLowerCase()} '${pat}'${path ? ` (in ${path})` : ""}`;
    }
    if (name === "Read") {
      const fp = strip(String(inp.file_path ?? ""));
      let rng = "";
      if (inp.offset) rng = `:${inp.offset}-${inp.offset + (inp.limit ?? 0)}`;
      return "read " + fp + rng;
    }
    if (name === "Edit") {
      const fp = strip(String(inp.file_path ?? ""));
      return `edit ${fp}\n- ${String(inp.old_string ?? "").trim()}\n+ ${String(
        inp.new_string ?? ""
      ).trim()}`;
    }
    if (name === "Write") {
      const fp = strip(String(inp.file_path ?? ""));
      const content = String(inp.content ?? "");
      const head = content.slice(0, 400) + (content.length > 400 ? " …" : "");
      return `write ${fp}\n${head}`;
    }
    if (name === "TodoWrite") {
      const todos: any[] = Array.isArray(inp.todos) ? inp.todos : [];
      const items = todos
        .filter((t) => t && typeof t === "object")
        .map((t) => String(t.content ?? "").slice(0, 60))
        .join("; ");
      return `todo: [${items}]`;
    }
    return `${name} ${JSON.stringify(inp ?? {}).slice(0, 160)}`;
  };
}

function resultSummary(content: any): string {
  if (Array.isArray(content)) {
    content = content
      .filter((x) => x && typeof x === "object")
      .map((x) => x.text ?? "")
      .join(" ");
  }
  if (typeof content !== "string") content = String(content ?? "");
  return content.trim();
}

function isNoiseUserString(s: string): boolean {
  return s.startsWith("<") || s.includes("command-name");
}

// Port of parse_chat_trajectory.py `parse()` over a list of event objects.
function parseEvents(events: any[]): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  let cur: (AgentTurn & { _action: string[] }) | null = null;
  let pendingObs: string[] = [];
  let agentN = 0;
  let humanK = 0;

  const cwd = events.find((l) => l && l.cwd)?.cwd as string | undefined;
  const strip = cwd
    ? (s: string) => s.replace(cwd.replace(/\/+$/, "") + "/", "")
    : (s: string) => s;
  const toolSurface = makeToolSurface(strip);

  const close = () => {
    if (cur) {
      cur.action = cur._action.join("\n").trim();
      cur.thought = cur.thought.trim();
      const { _action, ...turn } = cur;
      items.push(turn);
      cur = null;
    }
  };

  const newTurn = (thought: string) => {
    agentN += 1;
    return {
      n: agentN,
      obs: pendingObs.join("\n").trim(),
      thought,
      action: "",
      _action: [] as string[],
    };
  };

  for (const l of events) {
    if (!l || typeof l !== "object") continue;
    const t = l.type;
    if (t === "user") {
      const c = l.message?.content;
      if (typeof c === "string") {
        if (isNoiseUserString(c)) continue;
        close();
        pendingObs = [];
        humanK += 1;
        items.push({
          kind: "interaction",
          id: `H${humanK}`,
          actor: "human",
          text: c.trim(),
        });
      } else if (Array.isArray(c)) {
        for (const x of c) {
          if (x && x.type === "tool_result") {
            const s = resultSummary(x.content);
            if (s) pendingObs.push(s);
          }
        }
      }
    } else if (t === "assistant") {
      const content = l.message?.content;
      if (!Array.isArray(content)) continue;
      for (const x of content) {
        const k = x?.type;
        if (k === "text" || k === "thinking") {
          close();
          const txt = (k === "text" ? x.text : x.thinking) ?? "";
          cur = newTurn(String(txt).trim());
          pendingObs = [];
        } else if (k === "tool_use") {
          if (cur === null) {
            cur = newTurn("");
            pendingObs = [];
          }
          cur._action.push(toolSurface(x));
        }
      }
    }
  }
  close();

  // Truncate long environment observations; human text is never cut.
  for (const it of items) {
    if (!("kind" in it) && it.obs.length > OBS_LIMIT) {
      it.obs = it.obs.slice(0, OBS_LIMIT) + " …[truncated]";
    }
  }
  return items;
}

// Render a pre-parsed skeleton's `turns` array (skill output shape) to items.
function itemsFromSkeleton(turns: any[]): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  for (const t of turns) {
    if (!t || typeof t !== "object") continue;
    if (t.kind === "interaction") {
      items.push({
        kind: "interaction",
        id: String(t.id ?? "H?"),
        actor: String(t.actor ?? "human"),
        text: String(t.text ?? "").trim(),
      });
    } else {
      items.push({
        n: Number(t.n ?? items.length + 1),
        obs: String(t.obs ?? "").trim(),
        thought: String(t.thought ?? "").trim(),
        action: String(t.action ?? "").trim(),
      });
    }
  }
  return items;
}

// Render the structured items as a readable transcript document.
function renderTranscript(items: TranscriptItem[], meta: { title?: string; model?: string }): string {
  const lines: string[] = [];
  if (meta.title) lines.push(`# Trajectory: ${meta.title}`);
  if (meta.model) lines.push(`Model: ${meta.model}`);
  if (lines.length) lines.push("");

  for (const it of items) {
    if ("kind" in it) {
      lines.push(`--- Human (${it.id}) ---`);
      lines.push(it.text);
      lines.push("");
    } else {
      lines.push(`--- Turn ${it.n} (Agent) ---`);
      if (it.obs) {
        lines.push("Observation:");
        lines.push(it.obs);
      }
      if (it.thought) {
        lines.push("Thought:");
        lines.push(it.thought);
      }
      if (it.action) {
        lines.push("Action:");
        lines.push(it.action);
      }
      lines.push("");
    }
  }
  return lines.join("\n").trim() + "\n";
}

function looksLikeEvent(o: any): boolean {
  return o && typeof o === "object" && (o.type === "user" || o.type === "assistant");
}

/**
 * Convert raw trajectory file content into a plain-text transcript.
 * Returns null when the content is not a recognizable trajectory.
 */
export function convertTrajectoryToText(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Try JSONL (Claude Code native session log): one JSON event per line.
  const rawLines = trimmed.split("\n").filter((l) => l.trim());
  if (rawLines.length > 1) {
    const parsed: any[] = [];
    let ok = true;
    for (const line of rawLines) {
      try {
        parsed.push(JSON.parse(line));
      } catch {
        ok = false;
        break;
      }
    }
    if (ok && parsed.some(looksLikeEvent)) {
      const meta = parsed.find((l) => l && (l.instance_id || l.model)) || {};
      const items = parseEvents(parsed);
      if (items.length) return renderTranscript(items, { title: meta.instance_id, model: meta.model });
    }
  }

  // 2. Try a single JSON value: array of events, or a skeleton object.
  try {
    const obj = JSON.parse(trimmed);
    if (Array.isArray(obj) && obj.some(looksLikeEvent)) {
      const items = parseEvents(obj);
      if (items.length) return renderTranscript(items, {});
    }
    if (obj && typeof obj === "object" && Array.isArray(obj.turns)) {
      const items = itemsFromSkeleton(obj.turns);
      if (items.length)
        return renderTranscript(items, { title: obj.instance_id, model: obj.model });
    }
  } catch {
    /* not a single JSON value */
  }

  return null;
}
