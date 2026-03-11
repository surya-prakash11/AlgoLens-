import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const EXAMPLES = {
  "Merge Sort": `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)`,
  "Bubble Sort": `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`,
  "Binary Search": `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
  "Fibonacci": `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)`,
};

const COMPLEXITY_COLORS = {
  "O(1)": "#00ff88",
  "O(log n)": "#00d4ff",
  "O(n)": "#7dd3fc",
  "O(n log n)": "#fbbf24",
  "O(n²)": "#f97316",
  "O(2ⁿ)": "#ef4444",
};

function generateGrowthData() {
  const points = [1, 2, 4, 8, 16, 32, 64, 128, 256];
  return points.map((n) => ({
    n,
    "O(1)": 1,
    "O(log n)": Math.log2(n),
    "O(n)": n,
    "O(n log n)": n * Math.log2(n),
    "O(n²)": n * n > 70000 ? null : n * n,
    "O(2ⁿ)": Math.pow(2, n) > 70000 ? null : Math.pow(2, n),
  }));
}

// Build recursion tree data from analysis result
function buildTreeNodes(treeStructure, maxDepth = 4) {
  const nodes = [];
  const edges = [];
  let idCounter = 0;

  function traverse(label, x, y, depth, parentId = null) {
    if (depth > maxDepth) return;
    const id = idCounter++;
    nodes.push({ id, label, x, y, depth });
    if (parentId !== null) edges.push({ from: parentId, to: id });

    if (treeStructure && treeStructure.children) {
      const count = treeStructure.children;
      const spread = 320 / Math.pow(2, depth);
      const childLabels = treeStructure.childLabel || "n/b";
      for (let i = 0; i < count; i++) {
        const cx = x + (i - (count - 1) / 2) * spread;
        const cy = y + 80;
        traverse(childLabels, cx, cy, depth + 1, id);
      }
    }
  }

  if (treeStructure) {
    traverse(treeStructure.rootLabel || "n", 360, 40, 0);
  }
  return { nodes, edges };
}

function RecursionTree({ treeData }) {
  if (!treeData) return null;
  const { nodes, edges } = treeData;
  const height = Math.max(...nodes.map((n) => n.y)) + 80;

  return (
    <svg width="100%" viewBox={`0 0 720 ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#00d4ff44" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const from = nodes[e.from];
        const to = nodes[e.to];
        return (
          <line
            key={i}
            x1={from.x}
            y1={from.y + 16}
            x2={to.x}
            y2={to.y - 16}
            stroke="#00d4ff33"
            strokeWidth="1.5"
          />
        );
      })}
      {nodes.map((node) => {
        const colors = ["#00d4ff", "#00ff88", "#fbbf24", "#f97316", "#ef4444"];
        const c = colors[Math.min(node.depth, colors.length - 1)];
        return (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r="18"
              fill={`${c}15`}
              stroke={c}
              strokeWidth="1.5"
            />
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={c}
              fontSize="10"
              fontFamily="'JetBrains Mono', monospace"
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AlgoLens() {
  const [code, setCode] = useState(EXAMPLES["Merge Sort"]);
  const [activeExample, setActiveExample] = useState("Merge Sort");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("tree");
  const growthData = generateGrowthData();
  const textareaRef = useRef(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    setResult(null);

    const prompt = `You are an algorithm analysis engine. Analyze the following code and return ONLY a JSON object — no markdown, no explanation, just raw JSON.

Code:
\`\`\`
${code}
\`\`\`

Return this exact JSON structure:
{
  "algorithmName": "string (e.g. Merge Sort)",
  "patternDetected": "string (e.g. Divide and Conquer, Nested Loops, Binary Recursion, Linear Scan)",
  "timeComplexity": "string — one of: O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ)",
  "spaceComplexity": "string — one of: O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ)",
  "recurrenceRelation": "string (e.g. T(n) = 2T(n/2) + O(n)) or null if not recursive",
  "recurrenceExpansion": ["array of strings showing step-by-step expansion, e.g. T(n) = 2T(n/2) + n", "= 4T(n/4) + 2n", "= 8T(n/8) + 3n", "...", "= nT(1) + n log n"] or null if not recursive,
  "explanation": "2-3 sentence plain English explanation of WHY this complexity arises",
  "treeStructure": {
    "rootLabel": "n",
    "children": 2,
    "childLabel": "n/2",
    "levelsVisible": 4
  } or null if not recursive,
  "keyInsight": "One punchy sentence — the single most important thing to understand"
}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const raw = data.content.map((b) => b.text || "").join("");
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch (err) {
      setError("Analysis failed. Check your code and try again.");
    } finally {
      setLoading(false);
    }
  }

  const treeData = result?.treeStructure
    ? buildTreeNodes(result.treeStructure, result.treeStructure.levelsVisible || 4)
    : null;

  const complexityColor = result ? COMPLEXITY_COLORS[result.timeComplexity] || "#00d4ff" : "#00d4ff";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080810",
      color: "#e2e8f8",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      padding: "0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0d0d1a; }
        ::-webkit-scrollbar-thumb { background: #1e2040; border-radius: 3px; }
        textarea { resize: none; outline: none; }
        .scan-line {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.015) 2px, rgba(0,212,255,0.015) 4px);
          pointer-events: none; border-radius: inherit;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          70% { transform: scale(1); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .result-panel { animation: fade-in 0.4s ease forwards; }
        .tab-btn {
          background: transparent; border: none; cursor: pointer;
          font-family: 'JetBrains Mono', monospace; font-size: 12px;
          padding: 8px 16px; color: #4a5080; transition: all 0.2s;
          border-bottom: 2px solid transparent; letter-spacing: 0.05em;
        }
        .tab-btn.active { color: #00d4ff; border-bottom-color: #00d4ff; }
        .tab-btn:hover { color: #a0b0d0; }
        .example-btn {
          background: #0d0d1a; border: 1px solid #1e2040; border-radius: 4px;
          color: #4a5080; font-family: 'JetBrains Mono', monospace; font-size: 11px;
          padding: 5px 12px; cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }
        .example-btn.active, .example-btn:hover {
          background: #0a1428; border-color: #00d4ff44; color: #00d4ff;
        }
        .analyze-btn {
          background: linear-gradient(135deg, #00d4ff15, #00ff8815);
          border: 1px solid #00d4ff44; border-radius: 6px;
          color: #00d4ff; font-family: 'JetBrains Mono', monospace;
          font-size: 13px; font-weight: 600; padding: 12px 32px;
          cursor: pointer; transition: all 0.25s; letter-spacing: 0.1em;
          width: 100%; position: relative; overflow: hidden;
        }
        .analyze-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #00d4ff25, #00ff8825);
          border-color: #00d4ff88; box-shadow: 0 0 20px #00d4ff22;
          transform: translateY(-1px);
        }
        .analyze-btn:disabled { opacity: 0.5; cursor: default; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1a1a2e",
        padding: "18px 28px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        background: "linear-gradient(90deg, #0a0a14, #080810)",
      }}>
        <div style={{ position: "relative", width: 36, height: 36 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "2px solid #00d4ff", display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "#00d4ff0a",
          }}>
            <span style={{ fontSize: 16 }}>⬡</span>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
            Algo<span style={{ color: "#00d4ff" }}>Lens</span>
          </div>
          <div style={{ fontSize: 10, color: "#3a4060", letterSpacing: "0.15em", marginTop: 1 }}>
            ALGORITHM COMPLEXITY VISUALIZER
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.keys(EXAMPLES).map((name) => (
            <button
              key={name}
              className={`example-btn ${activeExample === name ? "active" : ""}`}
              onClick={() => { setCode(EXAMPLES[name]); setActiveExample(name); setResult(null); }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, height: "calc(100vh - 73px)" }}>
        
        {/* Left: Code input */}
        <div style={{ borderRight: "1px solid #1a1a2e", display: "flex", flexDirection: "column", padding: "20px" }}>
          <div style={{ fontSize: 10, color: "#3a4060", letterSpacing: "0.12em", marginBottom: 10 }}>
            // INPUT CODE
          </div>
          <div style={{
            flex: 1, position: "relative", borderRadius: 8,
            border: "1px solid #1a1a2e", overflow: "hidden",
            background: "#0a0a14",
          }}>
            <div className="scan-line" />
            {/* Line numbers */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 36,
              background: "#08080f", borderRight: "1px solid #1a1a2e",
              display: "flex", flexDirection: "column", padding: "16px 0",
              pointerEvents: "none", zIndex: 1,
            }}>
              {code.split("\n").map((_, i) => (
                <div key={i} style={{ fontSize: 10, color: "#2a2a40", textAlign: "right", paddingRight: 8, lineHeight: "1.6", height: "1.6em" }}>
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => { setCode(e.target.value); setActiveExample(""); setResult(null); }}
              spellCheck={false}
              style={{
                position: "absolute", inset: 0, paddingLeft: 48, paddingTop: 16,
                paddingRight: 16, paddingBottom: 16, width: "100%", height: "100%",
                background: "transparent", color: "#c8d0f0", fontSize: 13,
                lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace",
                border: "none", zIndex: 2,
              }}
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="analyze-btn" onClick={analyze} disabled={loading || !code.trim()}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #00d4ff44", borderTopColor: "#00d4ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  ANALYZING...
                </span>
              ) : "▶  ANALYZE COMPLEXITY"}
            </button>
            {error && (
              <div style={{ marginTop: 10, fontSize: 11, color: "#ef4444", textAlign: "center" }}>{error}</div>
            )}
          </div>
        </div>

        {/* Right: Results */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!result && !loading && (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 12, color: "#2a2a40",
            }}>
              <div style={{ fontSize: 48 }}>⬡</div>
              <div style={{ fontSize: 12, letterSpacing: "0.15em" }}>PASTE CODE → ANALYZE</div>
            </div>
          )}
          {loading && (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 16,
            }}>
              <div style={{
                width: 60, height: 60, border: "2px solid #00d4ff15",
                borderTopColor: "#00d4ff", borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
              <div style={{ fontSize: 11, color: "#3a4060", letterSpacing: "0.15em" }}>PARSING STRUCTURE...</div>
            </div>
          )}
          {result && (
            <div className="result-panel" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              
              {/* Complexity badge */}
              <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid #1a1a2e",
                background: "linear-gradient(90deg, #0a0a14, #080810)",
                display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
              }}>
                <div>
                  <div style={{ fontSize: 10, color: "#3a4060", letterSpacing: "0.12em", marginBottom: 4 }}>DETECTED PATTERN</div>
                  <div style={{ fontSize: 13, color: "#7090b0" }}>{result.patternDetected}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#3a4060", letterSpacing: "0.12em", marginBottom: 4 }}>TIME COMPLEXITY</div>
                  <div style={{
                    fontSize: 22, fontWeight: 700, color: complexityColor,
                    textShadow: `0 0 20px ${complexityColor}66`,
                    fontFamily: "'Syne', sans-serif",
                  }}>
                    {result.timeComplexity}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#3a4060", letterSpacing: "0.12em", marginBottom: 4 }}>SPACE</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#4a6080" }}>{result.spaceComplexity}</div>
                </div>
              </div>

              {/* Key insight */}
              {result.keyInsight && (
                <div style={{
                  padding: "10px 20px",
                  borderBottom: "1px solid #1a1a2e",
                  background: `${complexityColor}08`,
                  borderLeft: `3px solid ${complexityColor}44`,
                  fontSize: 12, color: "#8090b0", fontStyle: "italic",
                }}>
                  {result.keyInsight}
                </div>
              )}

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid #1a1a2e", padding: "0 20px" }}>
                {[
                  result.treeStructure && { id: "tree", label: "RECURSION TREE" },
                  { id: "growth", label: "GROWTH CHART" },
                  result.recurrenceRelation && { id: "recurrence", label: "RECURRENCE" },
                  { id: "explain", label: "EXPLANATION" },
                ].filter(Boolean).map((tab) => (
                  <button
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>

                {/* Recursion Tree */}
                {activeTab === "tree" && treeData && (
                  <div>
                    <div style={{ fontSize: 10, color: "#3a4060", letterSpacing: "0.12em", marginBottom: 16 }}>
                      // CALL TREE — depth {result.treeStructure.levelsVisible || 4}
                    </div>
                    <div style={{ background: "#0a0a14", borderRadius: 8, border: "1px solid #1a1a2e", padding: "20px 10px", position: "relative", overflow: "hidden" }}>
                      <div className="scan-line" />
                      <RecursionTree treeData={treeData} />
                    </div>
                    <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4ff" }} />
                      <span style={{ fontSize: 10, color: "#3a4060" }}>depth 0</span>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00ff88", marginLeft: 8 }} />
                      <span style={{ fontSize: 10, color: "#3a4060" }}>depth 1</span>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24", marginLeft: 8 }} />
                      <span style={{ fontSize: 10, color: "#3a4060" }}>depth 2+</span>
                    </div>
                  </div>
                )}

                {/* Growth Chart */}
                {activeTab === "growth" && (
                  <div>
                    <div style={{ fontSize: 10, color: "#3a4060", letterSpacing: "0.12em", marginBottom: 16 }}>
                      // RUNTIME GROWTH — operations vs input size n
                    </div>
                    <div style={{
                      background: "#0a0a14", borderRadius: 8, border: "1px solid #1a1a2e",
                      padding: "16px 8px 8px 8px",
                    }}>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={growthData}>
                          <XAxis dataKey="n" stroke="#2a2a40" tick={{ fill: "#3a4060", fontSize: 10 }} label={{ value: "n", fill: "#3a4060", fontSize: 11 }} />
                          <YAxis stroke="#2a2a40" tick={{ fill: "#3a4060", fontSize: 10 }} width={55} />
                          <Tooltip
                            contentStyle={{ background: "#0d0d1a", border: "1px solid #1e2040", borderRadius: 6, fontSize: 11, fontFamily: "monospace" }}
                            labelStyle={{ color: "#7090b0" }}
                          />
                          <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                          {Object.entries(COMPLEXITY_COLORS).map(([key, color]) => (
                            <Line
                              key={key}
                              type="monotone"
                              dataKey={key}
                              stroke={color}
                              strokeWidth={result.timeComplexity === key ? 3 : 1.5}
                              strokeOpacity={result.timeComplexity === key ? 1 : 0.35}
                              dot={false}
                              connectNulls={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 11, color: `${complexityColor}cc`, textAlign: "center" }}>
                      Your algorithm: <span style={{ color: complexityColor, fontWeight: 600 }}>{result.timeComplexity}</span> is highlighted
                    </div>
                  </div>
                )}

                {/* Recurrence */}
                {activeTab === "recurrence" && result.recurrenceRelation && (
                  <div>
                    <div style={{ fontSize: 10, color: "#3a4060", letterSpacing: "0.12em", marginBottom: 16 }}>
                      // RECURRENCE RELATION + EXPANSION
                    </div>
                    <div style={{
                      background: "#0a0a14", borderRadius: 8, border: "1px solid #1a1a2e",
                      padding: 20, position: "relative", overflow: "hidden",
                    }}>
                      <div className="scan-line" />
                      <div style={{ fontSize: 14, color: "#00d4ff", marginBottom: 20 }}>
                        {result.recurrenceRelation}
                      </div>
                      {result.recurrenceExpansion && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {result.recurrenceExpansion.map((step, i) => (
                            <div key={i} style={{
                              display: "flex", alignItems: "center", gap: 12,
                              opacity: i === 0 ? 1 : 0.7 + (i / result.recurrenceExpansion.length) * 0.3,
                            }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: "50%",
                                background: `${complexityColor}15`, border: `1px solid ${complexityColor}33`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 9, color: complexityColor, flexShrink: 0,
                              }}>
                                {i + 1}
                              </div>
                              <div style={{
                                fontSize: 12, color: i === result.recurrenceExpansion.length - 1 ? complexityColor : "#8090b0",
                                fontWeight: i === result.recurrenceExpansion.length - 1 ? 600 : 400,
                              }}>
                                {step}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {activeTab === "explain" && (
                  <div>
                    <div style={{ fontSize: 10, color: "#3a4060", letterSpacing: "0.12em", marginBottom: 16 }}>
                      // COMPLEXITY ANALYSIS
                    </div>
                    <div style={{
                      background: "#0a0a14", borderRadius: 8, border: "1px solid #1a1a2e",
                      padding: 20, lineHeight: 1.8, fontSize: 13, color: "#8090b0",
                    }}>
                      {result.explanation}
                    </div>
                    <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {[
                        { label: "Algorithm", value: result.algorithmName },
                        { label: "Pattern", value: result.patternDetected },
                        { label: "Time", value: result.timeComplexity },
                        { label: "Space", value: result.spaceComplexity },
                      ].map(({ label, value }) => (
                        <div key={label} style={{
                          background: "#0a0a14", borderRadius: 6,
                          border: "1px solid #1a1a2e", padding: "12px 16px",
                        }}>
                          <div style={{ fontSize: 9, color: "#3a4060", letterSpacing: "0.12em", marginBottom: 4 }}>{label.toUpperCase()}</div>
                          <div style={{ fontSize: 13, color: "#a0b0d0" }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
