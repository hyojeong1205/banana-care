// src/Signup.jsx
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase";
import { Link } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [msg, setMsg] = useState("");

  const signupWithEmail = async () => {
    setMsg("");
    
    if (!email || !pw || !confirmPw) {
      return setMsg("모든 필드를 입력해 주세요.");
    }
    
    if (pw !== confirmPw) {
      return setMsg("비밀번호가 일치하지 않습니다.");
    }
    
    if (pw.length < 6) {
      return setMsg("비밀번호는 최소 6자 이상이어야 합니다.");
    }

    try {
      await createUserWithEmailAndPassword(auth, email, pw);
      setMsg("회원가입이 완료되었습니다!");
    } catch (e) {
      setMsg(e.message);
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Banana Care 회원가입</h1>

      {/* 이메일/비밀번호 */}
      <div className="bg-white w-80 max-w-full rounded-2xl border p-4 space-y-3 mb-6">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border"
        />
        <input
          type="password"
          placeholder="비밀번호 확인"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border"
        />
        <button
          onClick={signupWithEmail}
          className="w-full px-3 py-2 rounded-xl border bg-black text-white"
        >
          이메일 회원가입
        </button>

        {!!msg && (
          <div className="text-sm text-red-500 whitespace-pre-wrap">{msg}</div>
        )}
      </div>

      

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            로그인하기
          </Link>
        </p>
      </div>
    </div>
  );
}
