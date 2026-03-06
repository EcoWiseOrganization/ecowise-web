"use client";

import { useRouter } from "next/navigation";
import { AuthLayout } from "@/app/(auth)/_components/AuthLayout";

function CheckIcon() {
  return (
    <div
      style={{
        padding: 10,
        background: "rgba(121, 182, 105, 0.10)",
        borderRadius: 100,
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        display: "inline-flex",
      }}
    >
      <div style={{ width: 100, height: 100, position: "relative", overflow: "hidden" }}>
        <svg
          width="75"
          height="75"
          viewBox="0 0 75 75"
          fill="none"
          style={{ position: "absolute", left: 12.5, top: 12.5 }}
        >
          <rect
            x="1"
            y="1"
            width="73"
            height="73"
            rx="36.5"
            stroke="#1F8505"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M22 38L32 48L53 27"
            stroke="#1F8505"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export default function ForgotPasswordSuccessPage() {
  const router = useRouter();

  return (
    <AuthLayout imageSrc="/img/login.png" imageAlt="EcoWise - Green landscape" logoPosition="top-right">
      <div
        style={{
          width: 232,
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "flex-end",
          gap: 46,
          display: "inline-flex",
          alignSelf: "center",
        }}
      >
        <div
          style={{
            alignSelf: "stretch",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: 20,
            display: "flex",
          }}
        >
          <CheckIcon />
          <div
            style={{
              textAlign: "center",
              justifyContent: "center",
              display: "flex",
              flexDirection: "column",
              color: "#3B3D3B",
              fontSize: 16,
              fontFamily: "Inter",
              fontWeight: 700,
            }}
          >
            Password Reset Successful
          </div>
        </div>
        <button
          onClick={() => router.push("/login")}
          style={{
            alignSelf: "stretch",
            paddingLeft: 20,
            paddingRight: 20,
            paddingTop: 10,
            paddingBottom: 10,
            background: "#79B669",
            overflow: "hidden",
            borderRadius: 10,
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            display: "inline-flex",
            cursor: "pointer",
            border: "none",
            color: "#FCFBFA",
            fontSize: 16,
            fontFamily: "Inter",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Sign in
        </button>
      </div>
    </AuthLayout>
  );
}
