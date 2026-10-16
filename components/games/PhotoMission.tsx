"use client";

import { useState } from "react";
import { Button, Banner } from "@/components/ui";

async function toJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1100 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("De foto kon niet worden verkleind.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.68));
  bitmap.close();
  if (!blob) throw new Error("De foto kon niet worden klaargezet.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("De foto kon niet worden gelezen."));
    reader.readAsDataURL(blob);
  });
  return dataUrl;
}

export function PhotoMission({
  prompt,
  busy,
  onSubmit,
}: {
  prompt: string;
  busy: boolean;
  onSubmit: (dataUrl: string) => Promise<void> | void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  return (
    <div className="stack">
      <article className="paper stack">
        <p className="kicker">Photo Mission</p>
        <h2 className="display">Samen in beeld</h2>
        <p className="serif" style={{ fontSize: "1.25rem" }}>{prompt}</p>
        <p className="small">De organisatie beoordeelt creativiteit, samenwerking en uitvoering. Er is geen automatische fotobeoordeling.</p>
      </article>
      <label className="btn primary full">
        Maak of kies een foto
        <input
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setReading(true);
            setError(null);
            try {
              setPreview(await toJpeg(file));
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "De foto lukte niet.");
            } finally {
              setReading(false);
            }
          }}
        />
      </label>
      <p className="small muted">
        Werkt de camera niet, kies dan een foto uit je bibliotheek. De app vraagt alleen toegang als je zelf een foto maakt.
      </p>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {preview ? <img src={preview} alt="Voorbeeld van jullie foto-opdracht" style={{ borderRadius: 18 }} /> : null}
      <Button full disabled={!preview || busy || reading} onClick={() => preview && onSubmit(preview)}>
        {reading ? "Foto voorbereiden…" : "Stuur de foto in"}
      </Button>
    </div>
  );
}
