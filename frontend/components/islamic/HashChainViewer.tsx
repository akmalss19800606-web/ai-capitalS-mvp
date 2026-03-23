"use client";
import { C } from "@/components/islamic/IslamicFinanceLayout";

export interface HashBlock {
  index: number;
  timestamp: string;
  data: string;
  prev_hash: string;
  hash: string;
  verified: boolean;
}

interface HashChainViewerProps {
  blocks: HashBlock[];
  title?: string;
}

export default function HashChainViewer({ blocks, title }: HashChainViewerProps) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.text }}>
        \u26d3\ufe0f {title || "\u0425\u0435\u0448-\u0446\u0435\u043f\u043e\u0447\u043a\u0430 \u0432\u0435\u0440\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438"}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {blocks.map((block, i) => (
          <div key={block.index} style={{ position: "relative" }}>
            {i > 0 && (
              <div style={{
                width: 2, height: 20, background: block.verified ? C.primary : "#ef4444",
                margin: "0 auto", marginBottom: 4
              }} />
            )}
            <div style={{
              background: block.verified ? C.infoBg : "#fef2f2",
              border: `1px solid ${block.verified ? C.primary : "#ef4444"}`,
              borderRadius: 10, padding: 14
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  \u0411\u043b\u043e\u043a #{block.index}
                </span>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 8,
                  background: block.verified ? "#dcfce7" : "#fecaca",
                  color: block.verified ? "#166534" : "#991b1b",
                  fontWeight: 600
                }}>
                  {block.verified ? "\u2705 \u0412\u0435\u0440\u0438\u0444\u0438\u0446\u0438\u0440\u043e\u0432\u0430\u043d" : "\u274c \u041d\u0435 \u0432\u0435\u0440\u0438\u0444\u0438\u0446\u0438\u0440\u043e\u0432\u0430\u043d"}
                </span>
              </div>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: C.muted }}>
                {block.timestamp} \u2014 {block.data}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: "monospace", wordBreak: "break-all" }}>
                Hash: {block.hash}
              </p>
              {block.prev_hash && block.prev_hash !== "0" && (
                <p style={{ margin: "4px 0 0", fontSize: 10, color: C.muted, fontFamily: "monospace", wordBreak: "break-all" }}>
                  Prev: {block.prev_hash}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {blocks.length === 0 && (
        <p style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>
          \u041d\u0435\u0442 \u0431\u043b\u043e\u043a\u043e\u0432 \u0432 \u0446\u0435\u043f\u043e\u0447\u043a\u0435
        </p>
      )}
    </div>
  );
}
