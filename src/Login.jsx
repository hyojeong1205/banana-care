// src/Login.jsx
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "./firebase";

function Login() {
  const login = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        console.log("로그인 성공:", result.user);
      })
      .catch((error) => {
        console.error("로그인 에러:", error);
      });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Banana Care</h1>
      <button
        onClick={login}
        className="px-4 py-2 bg-yellow-400 text-white rounded hover:bg-yellow-500"
      >
        구글 로그인
      </button>
    </div>
  );
}

export default Login;
