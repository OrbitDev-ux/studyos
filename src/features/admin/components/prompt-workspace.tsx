"use client";

import { FlaskConical, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { savePromptVersion, testPrompt } from "@/features/admin/prompt-actions";
import {
  PROMPT_MAX_LENGTH,
  validatePromptContent,
} from "@/features/admin/prompt-validation";
import { cn } from "@/lib/utils";

export function PromptWorkspace({
  promptId,
  initialContent,
}: {
  promptId: string;
  initialContent: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const dirty = content !== savedContent;
  const validation = useMemo(() => validatePromptContent(content), [content]);
  const lineCount = useMemo(() => content.split("\n").length, [content]);

  const gutterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function save() {
    if (!dirty || !validation.ok || saving) return;
    setSaving(true);
    try {
      const result = await savePromptVersion({ promptId, content, note });
      if (result?.error) {
        toast({ title: "저장 실패", description: result.error, variant: "error" });
        return;
      }
      setSavedContent(content);
      setNote("");
      toast({ title: "새 버전으로 저장되었습니다.", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "오류가 발생했습니다.", variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  // Cmd/Ctrl+S saves.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, savedContent, note, validation.ok, saving]);

  return (
    <div className="flex flex-col gap-3">
      <Tabs defaultValue="edit">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="edit">편집</TabsTrigger>
            <TabsTrigger value="preview">미리보기</TabsTrigger>
          </TabsList>
          <div className="text-muted-foreground flex items-center gap-3 text-xs tabular-nums">
            <span>
              {content.length.toLocaleString()} / {PROMPT_MAX_LENGTH.toLocaleString()}자
            </span>
            <span>{lineCount}줄</span>
            {dirty && (
              <span className="text-amber-600 dark:text-amber-400">● 변경됨</span>
            )}
          </div>
        </div>

        <TabsContent value="edit" className="pt-2">
          <div className="border-input bg-input/30 flex max-h-[60vh] min-h-80 overflow-hidden rounded-lg border font-mono text-xs">
            <div
              ref={gutterRef}
              aria-hidden
              className="text-muted-foreground/60 bg-muted/40 shrink-0 overflow-hidden py-2 pr-2 pl-3 text-right leading-5 select-none"
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onScroll={(e) => {
                if (gutterRef.current)
                  gutterRef.current.scrollTop = e.currentTarget.scrollTop;
              }}
              spellCheck={false}
              className="flex-1 resize-none bg-transparent py-2 pr-3 pl-2 leading-5 outline-none"
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="pt-2">
          <pre className="border-input bg-input/30 max-h-[60vh] min-h-80 overflow-auto rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap">
            {content || "(비어 있음)"}
          </pre>
        </TabsContent>
      </Tabs>

      {!validation.ok && <p className="text-destructive text-xs">{validation.error}</p>}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="version-note" className="text-xs">
            변경 메모 (선택)
          </Label>
          <Input
            id="version-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="이 버전에서 무엇을 바꿨나요?"
            className="h-9"
          />
        </div>
        <Button
          onClick={save}
          disabled={!dirty || !validation.ok || saving}
          className="h-9"
        >
          <Save className="size-4" />
          {saving ? "저장 중..." : "새 버전 저장 (⌘S)"}
        </Button>
      </div>

      <PromptTestPanel content={content} />
    </div>
  );
}

function PromptTestPanel({ content }: { content: string }) {
  const { toast } = useToast();
  const [subjectName, setSubjectName] = useState("수학");
  const [unit, setUnit] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [type, setType] = useState<"MULTIPLE_CHOICE" | "SHORT_ANSWER">("MULTIPLE_CHOICE");
  const [count, setCount] = useState(2);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setOutput(null);
    try {
      const result = await testPrompt({
        content,
        subjectName,
        unit,
        difficulty,
        type,
        count,
      });
      if (result.error) {
        toast({ title: "테스트 실패", description: result.error, variant: "error" });
        return;
      }
      setOutput(result.output ?? "");
    } catch {
      toast({ title: "테스트 실행 오류", variant: "error" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="border-input mt-1 flex flex-col gap-3 rounded-lg border border-dashed p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FlaskConical className="text-muted-foreground size-4" />
        프롬프트 테스트{" "}
        <span className="text-muted-foreground text-xs">(저장 안 됨 · 미리보기)</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          placeholder="과목"
          className="h-9"
        />
        <Input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="단원 (선택)"
          className="h-9"
        />
        <Select
          value={difficulty}
          onValueChange={(v) => setDifficulty(v as typeof difficulty)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EASY">쉬움</SelectItem>
            <SelectItem value="MEDIUM">보통</SelectItem>
            <SelectItem value="HARD">어려움</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MULTIPLE_CHOICE">객관식</SelectItem>
            <SelectItem value="SHORT_ANSWER">주관식</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}문제
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Button variant="secondary" size="sm" onClick={run} disabled={running}>
          {running ? "실행 중..." : "테스트 실행"}
        </Button>
      </div>
      {output !== null && (
        <pre
          className={cn(
            "bg-input/30 max-h-72 overflow-auto rounded-lg p-3 font-mono text-xs whitespace-pre-wrap",
          )}
        >
          {output || "(빈 응답)"}
        </pre>
      )}
    </div>
  );
}
