// src/Signup.jsx
import { useState, useEffect } from "react";
import {
  signInWithRedirect,
  createUserWithEmailAndPassword,
  getRedirectResult,
} from "firebase/auth";
import { auth, provider } from "./firebase";
import { Link } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [msg, setMsg] = useState("");

  // 리다이렉트 결과 처리
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // 회원가입 성공
          console.log("Google 회원가입 성공:", result.user);
        }
      } catch (error) {
        console.error("리다이렉트 회원가입 에러:", error);
        setMsg(error.message);
      }
    };

    handleRedirectResult();
  }, []);

  const signupWithGoogle = async () => {
    setMsg("");
    try {
      await signInWithRedirect(auth, provider);
    } catch (e) {
      setMsg(e.message);
      console.error(e);
    }
  };

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

      <div className="text-gray-400 text-sm mb-4">또는</div>

      {/* 구글 회원가입 */}
      <button
        onClick={signupWithGoogle}
        className="gsi-material-button"
      >
        <div className="gsi-material-button-state"></div>
        <div className="gsi-material-button-content-wrapper">
          <div className="gsi-material-button-icon">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlns:xlink="http://www.w3.org/1999/xlink" style={{display: "block"}}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          </div>
          <span className="gsi-material-button-contents">Sign up with Google</span>
          <span style={{display: "none"}}>Sign up with Google</span>
        </div>
      </button>

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
