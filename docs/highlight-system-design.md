# 高亮系统设计方案

## 一、现有问题分析

当前 `CodeHighLight.tsx` 有 **1844 行**，存在以下结构性问题：

### 1. 数据流混乱 — 没有单一数据源
```
cardStore.cardData → fileSpecificCardsRef → highlightedContentRef → DOM style → Lexical model
```
五个地方各存一份状态，任何一个不同步都会出 bug。

### 2. 清除机制重复且脆弱
删除 code 时需要**三重清除**：
- DOM `querySelectorAll` 移除 `background-color`
- Lexical `editor.update()` 替换 `TextNode`
- `highlightedContentRef` / `highlightResultsRef` 清空缓存

任何一步遗漏或时序错误都会导致"幽灵高亮"。

### 3. Retry Timers 造成竞态
主 effect 有 `setTimeout(1s)` 和 `setTimeout(2s)` 重试，与 `cardDataChanged` 事件竞争，导致被删除的 code 颜色被重新刷回。

### 4. 模糊匹配过于复杂
使用了 4 种算法（Jaro-Winkler / N-gram / Levenshtein / Jaccard），还有 spanning nodes、fuzzy substring 等多个路径，难以预测行为。

### 5. 职责耦合
一个文件包含：高亮引擎 + 颜色管理 + 匹配算法 + Tooltip + 右键添加 + 点击导航，完全不可维护。

---

## 二、新架构设计

### 核心原则
> **Lexical model 是唯一真相来源（Single Source of Truth）**
> 
> 不在 DOM 上做任何独立的样式操作。所有高亮通过 Lexical node style 管理，Lexical 自动同步到 DOM。

### 模块拆分

```
LexicalPlugins/
├── highlights/
│   ├── HighlightEngine.tsx      # 核心引擎：匹配 + 应用高亮
│   ├── HighlightCleaner.tsx     # 监听 card 变化，清除无效高亮
│   ├── HighlightColors.ts       # 颜色管理（单一入口）
│   ├── TextMatcher.ts           # 文本匹配算法（纯函数，可测试）
│   └── HighlightInteraction.tsx # 点击导航 + Tooltip
├── CodeHighLight.tsx            # 仅保留导出入口，组合上述模块
```

### 数据流（简化）

```
┌─────────────┐     subscribe      ┌──────────────────┐
│  cardStore   │ ──────────────────→│  HighlightEngine  │
│  (cardData)  │                    │                   │
│  (fileCardMap)│                    │  1. 获取当前文件的 │
└─────────────┘                    │     active codes   │
                                   │  2. 匹配文本        │
       ┌───────────────────────────│  3. 设置 node style │
       │                           └──────────────────┘
       │ Lexical model 变化
       ▼
┌─────────────┐
│  Lexical     │  自动 sync
│  DOM render  │ ─────────────→  用户看到的高亮
└─────────────┘

┌──────────────────┐    cardData 变化    ┌──────────────────┐
│  HighlightCleaner │ ◄─────────────────│  cardStore        │
│                   │                    │  (subscribe)      │
│  遍历 Lexical     │                    └──────────────────┘
│  nodes，移除      │
│  不属于 active    │
│  cards 的高亮     │
└──────────────────┘
```

---

## 三、各模块详细设计

### 3.1 `HighlightColors.ts` — 颜色管理

```typescript
import { CODE_COLORS } from "@/utils/codeColors";
import useCardStore from "@/stores/useCardStore";

// 单一颜色映射，外部只通过 getColorForCardId() 获取
let colorMap = new Map<string, string>();
let lastCardDataHash = "";

export function getColorForCardId(cardId: string): string {
  ensureFresh();
  return colorMap.get(cardId) ?? CODE_COLORS[0].bg;
}

export function ensureFresh() {
  const { cardData } = useCardStore.getState();
  const hash = cardData.filter(c => c.active !== false).map(c => c.id).join(",");
  if (hash === lastCardDataHash) return;
  
  lastCardDataHash = hash;
  colorMap.clear();
  cardData
    .filter(c => c.active !== false)
    .forEach((card, i) => {
      colorMap.set(card.id, CODE_COLORS[i % CODE_COLORS.length].bg);
    });
}
```

**规则：** 颜色由 active card 的排列顺序决定，全局一致（CodeLabel、高亮、Trajectory 都用同一个）。

### 3.2 `TextMatcher.ts` — 文本匹配（纯函数）

```typescript
export interface MatchResult {
  type: "exact" | "normalized" | "fuzzy";
  startOffset: number;  // 在原始文本中的起始位置
  endOffset: number;    // 在原始文本中的结束位置
  confidence: number;   // 0-100
}

/**
 * 在 text 中查找 query 的最佳匹配位置
 * 策略：精确 → 归一化 → 模糊（仅长文本）
 */
export function findMatch(text: string, query: string): MatchResult | null {
  // 1. 精确子串匹配（最快）
  const exactIdx = text.indexOf(query);
  if (exactIdx >= 0) {
    return { type: "exact", startOffset: exactIdx, endOffset: exactIdx + query.length, confidence: 100 };
  }

  // 2. 归一化匹配（忽略空白/标点/大小写）
  const normText = normalize(text);
  const normQuery = normalize(query);
  const normIdx = normText.indexOf(normQuery);
  if (normIdx >= 0) {
    const [origStart, origEnd] = mapNormalizedRange(text, normText, normIdx, normIdx + normQuery.length);
    return { type: "normalized", startOffset: origStart, endOffset: origEnd, confidence: 95 };
  }

  // 3. 跨节点不在此处理（由 Engine 层组合相邻节点后再调用）

  // 4. 模糊匹配 — 仅对长文本启用，阈值严格
  if (query.length < 30 || text.length < 20) return null;
  // ... sliding window + Jaro-Winkler，confidence 75-90
  
  return null;
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ").replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"').toLowerCase();
}
```

**规则：**
- 纯函数，不依赖任何 React/Lexical API
- 可单独写单元测试
- 模糊匹配仅在长文本（>30字符）时启用，且 confidence 必须 ≥ 75

### 3.3 `HighlightEngine.tsx` — 核心引擎

```typescript
export function HighlightEnginePlugin({ currentFileName }: { currentFileName: string }) {
  const [editor] = useLexicalComposerContext();
  const { selectedFile } = useEditorStore();
  const cardData = useCardStore(s => s.cardData);
  const fileCardMap = useCardStore(s => s.fileCardMap);

  // 单一 effect：当 file 或 cardData 变化时重新高亮
  useEffect(() => {
    if (!selectedFile) return;

    // 获取当前文件的 active cards
    const fileCardIds = new Set(fileCardMap[selectedFile] || []);
    const activeCards = cardData
      .filter(c => fileCardIds.has(c.id) && c.active !== false);

    if (activeCards.length === 0) {
      clearAllHighlights(editor);
      return;
    }

    // 收集所有 datapoints，按长度降序（长的优先匹配，避免短的吃掉长的子串）
    const datapoints = activeCards
      .flatMap(card => (card.topics || []).map(t => ({ cardId: card.id, content: t.content, topicId: t.id })))
      .filter(d => d.content?.trim())
      .sort((a, b) => b.content.length - a.content.length);

    // 延迟一帧，确保 Lexical 内容已渲染
    const raf = requestAnimationFrame(() => {
      applyHighlights(editor, datapoints);
    });

    return () => cancelAnimationFrame(raf);
  }, [editor, selectedFile, cardData, fileCardMap]);

  return null;
}

function applyHighlights(editor: LexicalEditor, datapoints: Datapoint[]) {
  editor.update(() => {
    // Step 1: 清除所有现有高亮（干净重建）
    clearAllHighlightsInModel();

    // Step 2: 收集所有文本节点
    const textNodes = collectTextNodes($getRoot());

    // Step 3: 对每个 datapoint，在文本节点中查找匹配
    const matched = new Set<string>(); // 已匹配的 content，避免重复

    for (const dp of datapoints) {
      if (matched.has(dp.content)) continue;

      // 尝试单节点匹配
      for (const node of textNodes) {
        const result = findMatch(node.getTextContent(), dp.content);
        if (result && result.confidence >= 75) {
          splitAndHighlight(node, result, dp.cardId);
          matched.add(dp.content);
          break;
        }
      }

      // 尝试跨节点匹配（2-3个相邻节点拼接）
      if (!matched.has(dp.content)) {
        // ... 拼接相邻节点文本后调用 findMatch
      }
    }
  });
}

function splitAndHighlight(node: TextNode, match: MatchResult, cardId: string) {
  const text = node.getTextContent();
  const color = getColorForCardId(cardId);
  const style = `background-color: ${color}; cursor: pointer; --card-id: ${cardId};`;

  const before = text.substring(0, match.startOffset);
  const highlighted = text.substring(match.startOffset, match.endOffset);
  const after = text.substring(match.endOffset);

  // 创建新节点
  const nodes: TextNode[] = [];
  if (before) nodes.push($createTextNode(before));

  const hlNode = $createTextNode(highlighted);
  hlNode.setStyle(style);
  nodes.push(hlNode);

  if (after) nodes.push($createTextNode(after));

  // 替换原节点
  if (nodes.length > 0 && node.isAttached()) {
    node.replace(nodes[0]);
    for (let i = 1; i < nodes.length; i++) {
      nodes[i - 1].insertAfter(nodes[i]);
    }
  }
}
```

**关键设计决策：**

| 决策 | 理由 |
|------|------|
| **每次全量重建高亮** | 消除增量更新的状态不一致问题。性能用 `requestAnimationFrame` + 长度排序优化 |
| **不用 retry timers** | 改为依赖 `cardData` 变化触发 re-render，React 自动重新执行 effect |
| **不缓存 `highlightedContentRef`** | 全量重建不需要缓存，消除了缓存与实际状态不一致的可能 |
| **先清除再重建** | 避免"幽灵高亮"，代价是每次多一次遍历，但 Lexical batch update 内性能可接受 |

### 3.4 `HighlightCleaner.tsx` — 变化监听

```typescript
export function HighlightCleanerPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // 监听 cardDataChanged 事件（删除/增加 code 时触发）
    const handler = () => {
      // 不需要做任何事！因为 cardData 变化 → HighlightEngine 的 useEffect 自动重新执行
      // 这个 plugin 只需要确保 cardData 是 useEffect 的依赖项即可
    };
    window.addEventListener("cardDataChanged", handler);
    return () => window.removeEventListener("cardDataChanged", handler);
  }, [editor]);

  return null;
}
```

实际上，如果 `HighlightEngine` 正确依赖了 `cardData`，**这个模块可以完全删除**。`cardDataChanged` 事件只在需要通知非 React 组件时才有用。

### 3.5 `HighlightInteraction.tsx` — 用户交互

```typescript
// 点击高亮文本 → 跳转到对应 code
// Alt+Click → 删除 datapoint
// Hover → 显示 code 名称 tooltip

export function HighlightInteractionPlugin({ currentFileName }) {
  const [editor] = useLexicalComposerContext();
  const { deleteDatapoint } = useCardStore();

  useEffect(() => {
    const rootEl = editor.getRootElement();
    if (!rootEl) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cardId = findCardIdFromElement(target);
      if (!cardId) return;

      if (e.altKey) {
        // Alt+Click: 删除 datapoint
        // ... deleteDatapoint logic
      } else {
        // 普通 Click: 导航到 code
        window.dispatchEvent(new CustomEvent("navigateToCard", { detail: { cardId } }));
      }
    };

    rootEl.addEventListener("click", handleClick);
    return () => rootEl.removeEventListener("click", handleClick);
  }, [editor, deleteDatapoint]);

  return null;
}

function findCardIdFromElement(el: HTMLElement): string | null {
  // 从 style 的 --card-id 读取，这是唯一标识
  const style = el.getAttribute("style") || "";
  const match = style.match(/--card-id:\s*([^;}\s]+)/);
  return match?.[1]?.trim() || null;
}
```

**规则：**
- 只监听 editor root element 内的事件（不是 `document`）
- Card ID 从 CSS custom property `--card-id` 读取，不需要 data attribute 或 fuzzy 匹配
- 不需要 MutationObserver

---

## 四、迁移计划

### Phase 1: 提取纯函数（低风险）
1. 创建 `TextMatcher.ts` — 把 `normalizeText`、`findBestTextMatch`、`findFuzzyMatchSubstring` 提取出去
2. 创建 `HighlightColors.ts` — 提取颜色逻辑
3. **不改变现有行为**，只是重组代码

### Phase 2: 替换核心引擎（中风险）
1. 实现 `HighlightEngine.tsx`（全量重建模式）
2. 删除 retry timers、`highlightedContentRef`、`isProcessingRef` 等缓存
3. 测试：添加/删除/regenerate code 后高亮正确

### Phase 3: 简化交互层（低风险）
1. 实现 `HighlightInteraction.tsx`
2. 删除 `DatapointTooltipPlugin` 中的 MutationObserver 和 setInterval
3. 删除 `AddDatapointPlugin`（已被右键菜单替代）

### Phase 4: 清理
1. 删除旧的 `CodeHighLight.tsx` 中的死代码
2. 新文件合计目标 **< 500 行**（现在 1844 行）

---

## 五、性能考虑

| 场景 | 当前方案 | 新方案 |
|------|---------|--------|
| 首次高亮 | 1次 + 2次 retry | 1次 `rAF` |
| 删除 code | event → 3重清除 → retry 可能重刷 | cardData 变化 → 1次全量重建 |
| 切换文件 | 清除 → 延迟重建 → 2次 retry | 1次全量重建 |
| 100个 codes × 10个 datapoints | ≈ 3次完整遍历 | ≈ 1次完整遍历 |

全量重建看似浪费，但在 `editor.update()` batch 内执行，Lexical 只做一次 DOM reconciliation。实测对 < 1000 个 datapoints 性能完全没问题。

---

## 六、总结

| | 现在 | 重构后 |
|---|---|---|
| 代码量 | 1844 行，1个文件 | ~400 行，5个文件 |
| 状态源 | 5个（cardData, ref, DOM, Lexical, cache） | 1个（Lexical model，由 cardData 驱动） |
| 清除机制 | 3重清除 + event | 全量重建（自动清除旧的） |
| 匹配算法 | 4种算法混合 | 精确 → 归一化 → 有条件模糊 |
| 竞态风险 | 高（timer + event + effect） | 低（React effect 自然调度） |
| 可测试性 | 不可测试 | TextMatcher 可单元测试 |
