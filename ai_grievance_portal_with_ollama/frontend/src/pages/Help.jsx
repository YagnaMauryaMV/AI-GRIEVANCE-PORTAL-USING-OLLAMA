import React from "react";
import { useLang } from "../context/LangContext";

export default function Help() {
  const { t } = useLang() || {};
  return (
    <div className="page help-page">
      <h2>{t?.helpTitle || "Help & FAQs"}</h2>
      <p>Contact info and FAQs go here.</p>
    </div>
  );
}
