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
import { CheckCircle, Smartphone } from "lucide-react";

// ── Schemas ─────────────────────────────────────────────────
const phoneSchema = z.object({
  phone_number: z
    .string()
    .min(10, "올바른 휴대폰 번호를 입력해주세요 (예: 01012345678)")
    .max(11, "올바른 휴대폰 번호를 입력해주세요 (예: 01012345678)")
    .refine((v) => /^01[0-9]{8,9}$/.test(v), "올바른 휴대폰 번호를 입력해주세요 (예: 01012345678)"),
});

const otpSchema = z.object({
  code: z.string().length(6, "인증번호 6자리를 입력해주세요."),
});

const registerSchema = z.object({
  full_name: z.string().min(1, "이름을 입력해주세요.").max(100),
  email: z.string().email("올바른 이메일을 입력해주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(128),
  password_confirm: z.string(),
}).refine((d) => d.password === d.password_confirm, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["password_confirm"],
});

type PhoneForm = z.infer<typeof phoneSchema>;
type OtpForm = z.infer<typeof otpSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

type Step = "phone" | "otp" | "info";

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<Step>("phone");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  // Phone form
  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) });
  // OTP form
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });
  // Register form
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  // ── Step 1: 전화번호 입력 & OTP 발송 ──────────────────────
  const handleSendOtp = async (data: PhoneForm) => {
    setError(null);
    setOtpSending(true);
    try {
      await authApi.sendOtp(data.phone_number);
      setVerifiedPhone(data.phone_number);
      setStep("otp");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "인증번호 발송에 실패했습니다.");
    } finally {
      setOtpSending(false);
    }
  };

  // ── Step 2: OTP 검증 ───────────────────────────────────────
  const handleVerifyOtp = async (data: OtpForm) => {
    setError(null);
    setOtpVerifying(true);
    try {
      await authApi.verifyOtp(verifiedPhone, data.code);
      setStep("info");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "인증번호가 올바르지 않습니다.");
    } finally {
      setOtpVerifying(false);
    }
  };

  // ── Step 3: 회원가입 ───────────────────────────────────────
  const handleRegister = async (data: RegisterForm) => {
    setError(null);
    try {
      const result = await authApi.register({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone_number: verifiedPhone,
      });
      setAuth(result.user, result.access_token);
      navigate("/profile");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "회원가입에 실패했습니다.");
    }
  };

  // ── Progress indicator ────────────────────────────────────
  const steps = [
    { key: "phone", label: "전화번호" },
    { key: "otp",   label: "인증번호" },
    { key: "info",  label: "정보 입력" },
  ] as const;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md bg-card border rounded-xl p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">SelfPR 가입</h1>
          <p className="text-muted-foreground mt-1 text-sm">AI가 당신의 자소서를 도와드립니다</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s.key
                  ? "bg-primary text-primary-foreground"
                  : steps.findIndex(x => x.key === step) > i
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}>
                {steps.findIndex(x => x.key === step) > i ? "✓" : i + 1}
              </div>
              <span className={`text-xs ${step === s.key ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: 전화번호 ── */}
        {step === "phone" && (
          <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone_number">
                <Smartphone size={14} className="inline mr-1" />
                휴대폰 번호
              </Label>
              <Input
                id="phone_number"
                placeholder="01012345678 (- 없이 입력)"
                inputMode="numeric"
                {...phoneForm.register("phone_number")}
              />
              {phoneForm.formState.errors.phone_number && (
                <p className="text-xs text-destructive">{phoneForm.formState.errors.phone_number.message}</p>
              )}
            </div>

            {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">{error}</div>}

            <Button type="submit" className="w-full" disabled={otpSending}>
              {otpSending ? "발송 중..." : "인증번호 받기"}
            </Button>
          </form>
        )}

        {/* ── Step 2: OTP ── */}
        {step === "otp" && (
          <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-center text-muted-foreground">
              <span className="font-medium text-foreground">{verifiedPhone}</span>으로<br />
              인증번호 6자리를 발송했습니다.
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="code">인증번호</Label>
              <Input
                id="code"
                placeholder="6자리 입력"
                inputMode="numeric"
                maxLength={6}
                {...otpForm.register("code")}
              />
              {otpForm.formState.errors.code && (
                <p className="text-xs text-destructive">{otpForm.formState.errors.code.message}</p>
              )}
            </div>

            {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">{error}</div>}

            <Button type="submit" className="w-full" disabled={otpVerifying}>
              {otpVerifying ? "확인 중..." : "인증 확인"}
            </Button>

            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => { setStep("phone"); setError(null); }}
            >
              번호 다시 입력
            </button>
          </form>
        )}

        {/* ── Step 3: 회원정보 입력 ── */}
        {step === "info" && (
          <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
            {/* 인증 완료 배지 */}
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-700">
              <CheckCircle size={15} className="shrink-0" />
              <span><span className="font-medium">{verifiedPhone}</span> 인증 완료</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full_name">이름</Label>
              <Input id="full_name" placeholder="홍길동" {...registerForm.register("full_name")} />
              {registerForm.formState.errors.full_name && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...registerForm.register("email")} />
              {registerForm.formState.errors.email && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">비밀번호</Label>
              <Input id="password" type="password" placeholder="8자 이상" {...registerForm.register("password")} />
              {registerForm.formState.errors.password && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password_confirm">비밀번호 확인</Label>
              <Input id="password_confirm" type="password" placeholder="비밀번호 재입력" {...registerForm.register("password_confirm")} />
              {registerForm.formState.errors.password_confirm && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.password_confirm.message}</p>
              )}
            </div>

            {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">{error}</div>}

            <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
              {registerForm.formState.isSubmitting ? "가입 중..." : "회원가입"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">로그인</Link>
        </p>
      </div>
    </div>
  );
}
