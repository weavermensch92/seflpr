import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";

const schema = z.object({
  full_name: z.string().min(1, "이름을 입력해주세요.").max(100),
  email: z.string().email("올바른 이메일을 입력해주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(128),
  password_confirm: z.string(),
}).refine((d) => d.password === d.password_confirm, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["password_confirm"],
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const result = await authApi.register({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
      });
      setAuth(result.user, result.access_token);
      navigate("/profile");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "회원가입에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md bg-card border rounded-xl p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">SelfPR 가입</h1>
          <p className="text-muted-foreground mt-1 text-sm">AI가 당신의 자소서를 도와드립니다</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">이름</Label>
            <Input id="full_name" placeholder="홍길동" autoComplete="name" {...register("full_name")} />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" type="password" placeholder="8자 이상" autoComplete="new-password" {...register("password")} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password_confirm">비밀번호 확인</Label>
            <Input id="password_confirm" type="password" placeholder="비밀번호 재입력" autoComplete="new-password" {...register("password_confirm")} />
            {errors.password_confirm && <p className="text-xs text-destructive">{errors.password_confirm.message}</p>}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "가입 중..." : "회원가입"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
