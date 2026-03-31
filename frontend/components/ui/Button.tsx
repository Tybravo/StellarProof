"use client";

import React from "react";

type CommonProps = {
  children: React.ReactNode;
  className?: string;
};

type AnchorProps = CommonProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type NativeButtonProps = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type Props = AnchorProps | NativeButtonProps;

export default function Button({
  href,
  children,
  className = "",
  ...rest
}: Props) {
  const base = "inline-flex items-center gap-2 px-3 py-2 rounded text-sm";

  if (href) {
    const anchorProps = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a
        href={href}
        className={`${base} ${className}  hover:bg-slate-800 text-slate-800 dark:text-slate-100`}
        {...anchorProps}
      >
        {children}
      </a>
    );
  }

  const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button
      className={`${base} ${className} bg-slate-600 hover:bg-slate-800 text-slate-800 dark:text-slate-100`}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
