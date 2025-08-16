// src/Login.jsx
import { useState } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, provider } from "./firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  const loginWithGoogle = async () => {
    setMsg("");
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      setMsg(e.message);
      console.error(e);
    }
  };

  const loginWithEmail = async () => {
    setMsg("");
    try {
      await signInWithEmailAndPassword(auth, email, pw);
    } catch (e) {
      setMsg(e.message);
      console.error(e);
    }
  };

  const signupWithEmail = async () => {
    setMsg("");
    try {
      await createUserWithEmailAndPassword(auth, email, pw);
    } catch (e) {
      setMsg(e.message);
      console.error(e);
    }
  };

  const resetPw = async () => {
    if (!email) return setMsg("이메일을 입력해 주세요.");
    try {
      await sendPasswordResetEmail(auth, email);
      setMsg("비밀번호 재설정 메일을 보냈어요.");
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Banana Care</h1>

      {/* 구글 로그인 */}
      <button
        onClick={loginWithGoogle}
        className="px-4 py-2 bg-yellow-400 text-white rounded hover:bg-yellow-500 w-60"
      >
        구글 로그인
      </button>

      <div className="my-6 text-gray-400 text-sm">또는</div>

      {/* 이메일/비밀번호 */}
      <div className="bg-white w-80 max-w-full rounded-2xl border p-4 space-y-3">
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
        <div className="flex gap-2">
          <button
            onClick={loginWithEmail}
            className="flex-1 px-3 py-2 rounded-xl border"
          >
            이메일 로그인
          </button>
          <button
            onClick={signupWithEmail}
            className="flex-1 px-3 py-2 rounded-xl border bg-black text-white"
          >
            회원가입
          </button>
        </div>
        <button
          onClick={resetPw}
          className="w-full text-sm text-gray-600 hover:underline"
        >
          비밀번호 재설정 메일 보내기
        </button>

        {!!msg && (
          <div className="text-sm text-red-500 whitespace-pre-wrap">{msg}</div>
        )}
      </div>
    </div>
  );
}
