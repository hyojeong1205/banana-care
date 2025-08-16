// src/Login.jsx
import { useState, useEffect } from "react";
import {
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  getRedirectResult,
} from "firebase/auth";
import { auth, provider } from "./firebase";
import { Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  // 리다이렉트 결과 처리
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // 로그인 성공
          console.log("Google 로그인 성공:", result.user);
          setMsg("로그인 성공!");
        }
      } catch (error) {
        console.error("리다이렉트 로그인 에러:", error);
        if (error.code === 'auth/unauthorized-domain') {
          setMsg("도메인이 승인되지 않았습니다. Firebase 콘솔에서 localhost를 추가해주세요.");
        } else {
          setMsg(error.message);
        }
      }
    };

    handleRedirectResult();
  }, []);

  const loginWithGoogle = async () => {
    setMsg("");
    try {
      await signInWithRedirect(auth, provider);
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
                 <button
           onClick={loginWithEmail}
           className="w-full px-3 py-2 rounded-xl border bg-black text-white"
         >
           이메일 로그인
         </button>
         <button
           onClick={resetPw}
           className="w-full text-sm text-gray-600 hover:underline"
         >
           비밀번호를 잊어버리셨나요?
         </button>

        {!!msg && (
          <div className="text-sm text-red-500 whitespace-pre-wrap">{msg}</div>
        )}
             </div>

       <div className="text-gray-400 text-sm mb-4 mt-6">또는</div>

       {/* 구글 로그인 */}
       <button
         onClick={loginWithGoogle}
         className="gsi-material-button mb-3"
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
           <span className="gsi-material-button-contents">Sign in with Google</span>
           <span style={{display: "none"}}>Sign in with Google</span>
         </div>
       </button>

       <div className="mt-6 text-center">
         <p className="text-sm text-gray-600">
           계정이 없으신가요?{" "}
           <Link to="/signup" className="text-blue-600 hover:underline">
             회원가입하기
           </Link>
         </p>
       </div>

     </div>
  );
}
