import { useState } from "react";
import { useTxt } from "../context/ToneContext";
import { BAR_WEIGHT_KG, writeCountsBar, type CountsBar } from "../data/barbell";

interface Props {
  onAnswered: (answer: CountsBar) => void;
}

// Joke first-launch question: "Do you count the bar towards the weight?"
// We don't pretend either answer is wrong — the modal just persists the
// user's stance so we can mirror it on barbell exercise cards.
export default function BarWeightQuestion({ onAnswered }: Props) {
  const t = useTxt();
  const [picked, setPicked] = useState<CountsBar | null>(null);

  const choose = (answer: CountsBar) => {
    writeCountsBar(answer);
    setPicked(answer);
  };

  const headline = t(
    "One thing before we start.",
    "Yo. Real quick.",
    "Hey bestie — one thing first.",
  );

  const question = t(
    `Do you count the bar (${BAR_WEIGHT_KG} kg) towards your lifts?`,
    `When you say you benched 100, does the bar count or not, brother?`,
    `When you say you squatted 100 — bar included, or just the plates?`,
  );

  const verdictYes = t(
    `Bar included. So "100 kg" means 100 kg total. Honest. Bold. Geometrically sound.`,
    `Bar's in. 100 means 100. Real ones do it this way.`,
    `Bar counts, queen. 100 = 100. Math respects you.`,
  );
  const verdictNo = t(
    `Plates only. We'll quietly add ${BAR_WEIGHT_KG} kg on barbell lifts so your records still look right. We won't tell anyone.`,
    `Just the plates, bro. We'll silently tack on the ${BAR_WEIGHT_KG} kg bar so your PRs aren't liars.`,
    `Plates only, slay. We'll silently tack on the ${BAR_WEIGHT_KG} kg bar so the PRs aren't lying.`,
  );

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="bar-q-title">
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div className="modal-title" id="bar-q-title">
          <span aria-hidden="true">🏋️</span>
          <span>{headline}</span>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.45, color: "var(--text)" }}>
          {question}
        </div>

        {picked === null ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
              <button className="motivate-preset" onClick={() => choose("yes")}>
                {t(
                  `Yes — the bar counts.`,
                  `Yeah, bar counts. I'm not a coward.`,
                  `Yes — bar counts, obviously.`,
                )}
              </button>
              <button className="motivate-preset" onClick={() => choose("no")}>
                {t(
                  `No — only the plates count.`,
                  `Nah, just the plates. Bar's free.`,
                  `Just the plates, bestie.`,
                )}
              </button>
            </div>
            <button
              onClick={() => choose("off")}
              style={{
                background: "none", border: "none", color: "var(--muted)",
                fontSize: 12, textDecoration: "underline", cursor: "pointer",
                marginTop: 4, padding: 4, alignSelf: "center",
              }}
            >
              {t(
                "Not in the mood — skip this joke",
                "Not now, bro — skip the bit",
                "Not now, bestie — skip the bit",
              )}
            </button>
          </>
        ) : (
          <>
            <div className="modal-sub" style={{ marginTop: 4, lineHeight: 1.5 }}>
              {picked === "yes" ? verdictYes
               : picked === "no" ? verdictNo
               : t(
                  `Cool. We'll stop asking. You can switch it back on in Settings if curiosity wins.`,
                  `Cool. Joke's off. Flip it back on in Settings whenever, brother.`,
                  `All good, bestie. Flip it back on in Settings if you change your mind.`,
                )}
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => onAnswered(picked)}>
                {t("Got it", "Let's lift", "Let's go bestie")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
