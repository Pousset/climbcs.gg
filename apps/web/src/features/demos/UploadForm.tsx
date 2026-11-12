import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { describeError } from '../../lib/errors';
import { formatBytes } from '../../lib/format';

interface UploadFormProps {
  /** Disabled when the daily quota is used up. */
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
}

export function UploadForm({ disabled = false, onUpload }: UploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) return setError('Choisis un fichier .dem à envoyer.');
    if (!file.name.toLowerCase().endsWith('.dem')) {
      return setError('Le fichier doit être une démo CS2 au format .dem.');
    }
    setError(null);
    setPending(true);
    try {
      await onUpload(file);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="upload" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="demo-file">Démo CS2 (.dem)</label>
        <input
          ref={inputRef}
          id="demo-file"
          type="file"
          accept=".dem"
          disabled={disabled || pending}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError(null);
          }}
        />
        {file && <span className="muted">{`${file.name} · ${formatBytes(file.size)}`}</span>}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--primary" disabled={disabled || pending}>
        {pending ? 'Envoi en cours…' : 'Analyser la démo'}
      </button>
    </form>
  );
}
