import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Users, FileText, Briefcase, CheckCircle, Activity, Clock, ShieldCheck,
  Sliders, RotateCcw, Save, ChevronDown, ChevronUp, AlertTriangle,
  Ban, CheckCircle2, Coins, Phone, LogIn,
} from "lucide-react";
import { adminApi, type PromptConfig, type AdminUser, PROMPT_CATEGORY_LABELS } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type Tab = "dashboard" | "users" | "prompts";

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck size={22} className="text-emerald-500" /> Admin Panel
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">관리자 전용 — 권한 없는 접근 차단됨</p>
        </div>
        <div className="bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10 flex items-center gap-1.5 text-xs text-primary">
          <Clock size={13} /> 실시간 동기화
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b">
        {([
          { key: "dashboard", label: "대시보드", icon: Activity },
          { key: "users",     label: "사용자 관리", icon: Users },
          { key: "prompts",   label: "프롬프트 관리", icon: Sliders },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "users" && <UsersTab />}
      {tab === "prompts" && <PromptsTab />}
    </div>
  );
}

// ── 대시보드 탭 ─────────────────────────────────────────────
function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: adminApi.getDashboard,
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="py-20 text-center text-muted-foreground animate-pulse">데이터 불러오는 중...</div>;

  const stats = data?.stats;
  const logs = data?.recent_logs || [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "총 가입 유저", value: stats?.user_count, icon: Users, color: "bg-blue-500" },
          { label: "등록 프로필 수", value: stats?.profile_count, icon: FileText, color: "bg-emerald-500" },
          { label: "자소서 프로젝트", value: stats?.project_count, icon: Briefcase, color: "bg-amber-500" },
          { label: "AI 답변 생성", value: stats?.answer_count, icon: CheckCircle, color: "bg-purple-500" },
        ].map((item, i) => (
          <div key={i} className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold mt-1">{item.value?.toLocaleString() ?? "-"}</p>
              </div>
              <div className={`${item.color} p-2.5 rounded-xl text-white`}>
                <item.icon size={18} />
              </div>
            </div>
            {i === 3 && (
              <div className="mt-3 pt-3 border-t border-dashed flex justify-between text-xs">
                <span className="text-muted-foreground">성공률</span>
                <span className="font-bold text-emerald-500">{stats?.generation_success_rate.toFixed(1)}%</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
            <Activity size={18} className="text-primary" /> 에이전트 실행 로그
          </h2>
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs font-bold uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">유저</th>
                  <th className="px-5 py-3">액션</th>
                  <th className="px-5 py-3">시각</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t">
                {logs.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">활동 기록 없음</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 group">
                    <td className="px-5 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-medium
                        ${log.status.includes("done") ? "text-emerald-600" : "text-amber-600"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${log.status.includes("done") ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-sm">{log.username}</td>
                    <td className="px-5 py-3 text-sm">
                      {log.action}
                      <p className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{log.details}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <h2 className="text-lg font-bold mb-3">인사이트</h2>
          <div className="bg-gradient-to-br from-primary to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
            <p className="text-xs opacity-70 mb-4 font-medium">평균 서비스 이용 지표</p>
            <p className="text-xs opacity-60">문항당 평균 AI 첨삭 횟수</p>
            <p className="text-4xl font-black mt-1">{stats?.avg_revisions_used.toFixed(2)}회</p>
            <div className="w-full bg-white/20 h-1 rounded-full mt-3 overflow-hidden">
              <div className="bg-white h-full rounded-full" style={{ width: `${Math.min((stats?.avg_revisions_used || 0) / 5 * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 사용자 관리 탭 ───────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [grantTarget, setGrantTarget] = useState<AdminUser | null>(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("admin_grant");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: adminApi.listUsers,
    refetchInterval: 30000,
  });

  const toggleMutation = useMutation({
    mutationFn: (userId: string) => adminApi.toggleUserActive(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const grantMutation = useMutation({
    mutationFn: ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) =>
      adminApi.grantPoints(userId, amount, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      setGrantTarget(null);
      setGrantAmount("");
      setGrantReason("admin_grant");
    },
  });

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone_number ?? "").includes(search)
  );

  if (isLoading)
    return <div className="py-20 text-center text-muted-foreground animate-pulse">불러오는 중...</div>;

  return (
    <div className="space-y-4">
      {/* 검색 + 통계 */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="이름, 이메일, 전화번호 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground shrink-0">
          총 {users.length}명 · 활성 {users.filter((u) => u.is_active).length}명
        </span>
      </div>

      {/* 포인트 지급 모달 */}
      {grantTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Coins size={18} className="text-amber-500" /> 포인트 지급
            </h3>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{grantTarget.full_name}</span> ({grantTarget.email})
              <br />현재 잔액: <span className="font-bold text-primary">{grantTarget.point_balance.toLocaleString()}P</span>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">지급 포인트</label>
              <Input
                type="number"
                placeholder="예: 100"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">사유</label>
              <Input
                placeholder="admin_grant"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setGrantTarget(null)}>
                취소
              </Button>
              <Button
                className="flex-1 gap-1"
                disabled={!grantAmount || Number(grantAmount) <= 0 || grantMutation.isPending}
                onClick={() =>
                  grantMutation.mutate({
                    userId: grantTarget.id,
                    amount: Number(grantAmount),
                    reason: grantReason || "admin_grant",
                  })
                }
              >
                <Coins size={14} /> {grantMutation.isPending ? "지급 중..." : "지급"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 테이블 */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs font-bold uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3">사용자</th>
              <th className="px-5 py-3">전화번호</th>
              <th className="px-5 py-3 text-right">포인트</th>
              <th className="px-5 py-3 text-right">결제</th>
              <th className="px-5 py-3">마지막 로그인</th>
              <th className="px-5 py-3">상태</th>
              <th className="px-5 py-3 text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y border-t">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  검색 결과 없음
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className={`hover:bg-muted/20 transition-colors ${!u.is_active ? "opacity-50" : ""}`}>
                  {/* 사용자 */}
                  <td className="px-5 py-3">
                    <p className="font-medium flex items-center gap-1.5">
                      {u.full_name}
                      {u.is_admin && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-400 text-emerald-600">ADMIN</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>

                  {/* 전화번호 */}
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {u.phone_number ? (
                      <span className="flex items-center gap-1">
                        <Phone size={11} /> {u.phone_number}
                      </span>
                    ) : (
                      <span className="text-destructive/60">미인증</span>
                    )}
                  </td>

                  {/* 포인트 */}
                  <td className="px-5 py-3 text-right font-mono text-sm">
                    {u.point_balance === 9999999 ? (
                      <span className="text-emerald-600 font-bold">∞</span>
                    ) : (
                      <span className="font-medium">{u.point_balance.toLocaleString()}</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-0.5">P</span>
                  </td>

                  {/* 결제 */}
                  <td className="px-5 py-3 text-right">
                    {u.payment_count > 0 ? (
                      <span className="text-primary font-medium">{u.payment_count}건</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">없음</span>
                    )}
                  </td>

                  {/* 마지막 로그인 */}
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {u.last_login_at ? (
                      <span className="flex items-center gap-1">
                        <LogIn size={11} />
                        {new Date(u.last_login_at).toLocaleDateString("ko-KR")}
                      </span>
                    ) : "-"}
                  </td>

                  {/* 상태 */}
                  <td className="px-5 py-3">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 활성
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" /> 정지
                      </span>
                    )}
                  </td>

                  {/* 액션 */}
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* 포인트 지급 */}
                      {!u.is_admin && (
                        <Button
                          variant="outline" size="sm"
                          className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                          onClick={() => setGrantTarget(u)}
                        >
                          <Coins size={12} /> 포인트
                        </Button>
                      )}
                      {/* 계정 정지/활성화 */}
                      {!u.is_admin && (
                        <Button
                          variant="outline" size="sm"
                          className={`h-7 text-xs gap-1 ${u.is_active
                            ? "border-destructive/40 text-destructive hover:bg-destructive/5"
                            : "border-emerald-400 text-emerald-700 hover:bg-emerald-50"}`}
                          disabled={toggleMutation.isPending}
                          onClick={() => {
                            if (confirm(`${u.full_name} 계정을 ${u.is_active ? "정지" : "활성화"}할까요?`))
                              toggleMutation.mutate(u.id);
                          }}
                        >
                          {u.is_active
                            ? <><Ban size={12} /> 정지</>
                            : <><CheckCircle2 size={12} /> 활성화</>}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 프롬프트 관리 탭 ─────────────────────────────────────────
function PromptsTab() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);

  const { data: prompts, isLoading } = useQuery({
    queryKey: ["admin", "prompts"],
    queryFn: adminApi.listPrompts,
  });

  const handleEdit = (p: PromptConfig) => {
    setEditingKey(p.prompt_key);
    setEditContent(p.content);
    setExpanded(p.prompt_key);
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      await adminApi.updatePrompt(key, editContent);
      await qc.invalidateQueries({ queryKey: ["admin", "prompts"] });
      setEditingKey(null);
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key: string) => {
    if (!confirm("이 프롬프트를 코드 기본값으로 초기화할까요?")) return;
    setResetting(key);
    try {
      await adminApi.resetPrompt(key);
      await qc.invalidateQueries({ queryKey: ["admin", "prompts"] });
      if (editingKey === key) setEditingKey(null);
    } catch {
      alert("초기화 중 오류가 발생했습니다.");
    } finally {
      setResetting(null);
    }
  };

  if (isLoading) return <div className="py-20 text-center text-muted-foreground animate-pulse">프롬프트 불러오는 중...</div>;

  // 카테고리별 그룹화
  const grouped = (prompts || []).reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, PromptConfig[]>);

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-amber-800">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <p>프롬프트 수정은 즉시 AI 생성 결과에 반영됩니다. 신중하게 수정하고, 문제가 생기면 <strong>기본값 초기화</strong>를 사용하세요.</p>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded-full" />
            {PROMPT_CATEGORY_LABELS[category] || category}
          </h3>
          <div className="space-y-2">
            {items.map((p) => {
              const isExpanded = expanded === p.prompt_key;
              const isEditing = editingKey === p.prompt_key;
              const isModified = p.content !== p.default_content;

              return (
                <div key={p.prompt_key} className="border rounded-xl overflow-hidden bg-card shadow-sm">
                  {/* 행 헤더 */}
                  <div
                    className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : p.prompt_key)}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-semibold flex items-center gap-2">
                          {p.label}
                          {isModified && (
                            <Badge variant="muted" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700">수정됨</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(p.updated_at).toLocaleDateString()}
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </div>
                  </div>

                  {/* 펼침 내용 */}
                  {isExpanded && (
                    <div className="border-t px-5 py-4 space-y-3 bg-muted/10">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          {isEditing ? "편집 중" : "현재 프롬프트"}
                        </p>
                        <div className="flex gap-2">
                          {isModified && !isEditing && (
                            <Button
                              variant="outline" size="sm" className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                              onClick={() => handleReset(p.prompt_key)}
                              disabled={resetting === p.prompt_key}
                            >
                              <RotateCcw size={12} />
                              {resetting === p.prompt_key ? "초기화 중..." : "기본값으로 초기화"}
                            </Button>
                          )}
                          {isEditing ? (
                            <>
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditingKey(null)}>
                                취소
                              </Button>
                              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleSave(p.prompt_key)} disabled={saving}>
                                <Save size={12} /> {saving ? "저장 중..." : "저장"}
                              </Button>
                            </>
                          ) : (
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleEdit(p)}>
                              <Sliders size={12} /> 편집
                            </Button>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full h-72 text-xs font-mono leading-relaxed border rounded-lg p-3 bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      ) : (
                        <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-lg p-4 max-h-64 overflow-y-auto text-foreground">
                          {p.content}
                        </pre>
                      )}

                      {isModified && !isEditing && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">원본(기본값) 보기</summary>
                          <pre className="mt-2 font-mono leading-relaxed whitespace-pre-wrap bg-muted/20 rounded-lg p-3 max-h-48 overflow-y-auto text-muted-foreground">
                            {p.default_content}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
