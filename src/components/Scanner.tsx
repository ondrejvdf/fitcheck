import { useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import Icon from "./Icon";
export default function Scanner({
  onCode,
  onClose,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let controls: IScannerControls | undefined,
      closed = false,
      found = false;
    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        video.current!,
        (result) => {
          if (result && !closed && !found) {
            found = true;
            controls?.stop();
            onCode(result.getText());
          }
        },
      )
      .then((c) => {
        controls = c;
        if (closed || found) c.stop();
      })
      .catch(() =>
        setError(
          "Kameru nelze spustit. Povol přístup v prohlížeči, použij HTTPS nebo zadej kód ručně.",
        ),
      );
    return () => {
      closed = true;
      controls?.stop();
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <button
          className="close icon-button"
          onClick={onClose}
          aria-label="Zavřít kameru"
        >
          <Icon name="X" />
        </button>
        <h2>Naskenovat potravinu</h2>
        <p>Namiř fotoaparát na čárový kód na obalu.</p>
        <div className="camera">
          <video ref={video} muted playsInline />
          <div className="viewfinder" />
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button secondary" onClick={onClose}>
          Zadat kód ručně
        </button>
      </section>
    </div>
  );
}
