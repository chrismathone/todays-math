"use client";

import { useState, type InputHTMLAttributes } from "react";
import styles from "./auth.module.css";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function AuthField({
  label,
  error,
  hint,
  id,
  type,
  className = "",
  ...props
}: AuthFieldProps) {
  const [visible, setVisible] = useState(false);
  const errorId = error && id ? `${id}-error` : undefined;
  const hintId = hint && id ? `${id}-hint` : undefined;
  const isPassword = type === "password";

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.inputWrap}>
        <input
          {...props}
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [errorId, hintId].filter(Boolean).join(" ") || undefined
          }
          className={`${styles.input} ${isPassword ? styles.passwordInput : ""} ${className}`}
        />
        {isPassword ? (
          <button
            type="button"
            className={styles.visibility}
            aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
            aria-pressed={visible}
            aria-controls={id}
            onClick={() => setVisible(!visible)}
          >
            {visible ? "숨김" : "보기"}
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
