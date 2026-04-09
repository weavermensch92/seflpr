import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft, Building2, HelpCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { projectsApi } from "@/api/projects";

export default function ProjectCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    company_name: "",
    position: "",
    title: "",
    questions: [
      { question_number: 1, question_text: "", char_limit: 500 }
    ]
  });

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        { 
          question_number: formData.questions.length + 1, 
          question_text: "", 
          char_limit: 500 
        }
      ]
    });
  };

  const removeQuestion = (index: number) => {
    if (formData.questions.length === 1) return;
    const newQuestions = formData.questions
      .filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, question_number: i + 1 }));
    setFormData({ ...formData, questions: newQuestions });
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData({ ...formData, questions: newQuestions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name || !formData.position) return;
    
    setLoading(true);
    try {
      // 제목이 없으면 기본값 생성
      const payload = {
        ...formData,
        title: formData.title || `${formData.company_name} - ${formData.position}`,
      };
      const result = await projectsApi.create(payload);
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate(`/projects/${result.id}`);
    } catch (err) {
      console.error(err);
      alert("프로젝트 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">새 프로젝트 생성</h1>
          <p className="text-muted-foreground text-sm">지원할 기업과 자소서 문항을 등록하세요.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 기본 정보 */}
        <section className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 size={18} className="text-primary" /> 기본 정보
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">기업명</label>
              <Input
                placeholder="예: 삼성전자, 네이버, 카카오"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">지원 포지션</label>
              <Input
                placeholder="예: 백엔드 개발자 인턴, 마케팅 전략"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">프로젝트 제목 (선택)</label>
            <Input
              placeholder="예: 2024 상반기 삼성전자 인턴 지원"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
        </section>

        {/* 자소서 문항 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <HelpCircle size={18} className="text-primary" /> 자소서 문항
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="gap-1.5">
              <Plus size={14} /> 문항 추가
            </Button>
          </div>

          <div className="space-y-4">
            {formData.questions.map((q, index) => (
              <div key={index} className="bg-card border rounded-xl p-5 relative group">
                <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                  {q.question_number}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">질문 내용</label>
                      <Input
                        placeholder="질문 문항을 입력하세요."
                        value={q.question_text}
                        onChange={(e) => handleQuestionChange(index, "question_text", e.target.value)}
                        required
                      />
                    </div>
                    <div className="w-24 space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">글자 수</label>
                      <Input
                        type="number"
                        placeholder="500"
                        value={q.char_limit}
                        onChange={(e) => handleQuestionChange(index, "char_limit", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    {formData.questions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-7 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => removeQuestion(index)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={() => navigate("/projects")}>
            취소
          </Button>
          <Button type="submit" disabled={loading} className="gap-2 px-8">
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            프로젝트 생성
          </Button>
        </div>
      </form>
    </div>
  );
}
