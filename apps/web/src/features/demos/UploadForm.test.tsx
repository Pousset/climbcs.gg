import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api';
import { UploadForm } from './UploadForm';

const demo = (name = 'match.dem') => new File(['PBDEMS2'], name);

describe('UploadForm', () => {
  it('asks for a file when none is selected', async () => {
    const onUpload = vi.fn();
    render(<UploadForm onUpload={onUpload} />);
    await userEvent.click(screen.getByRole('button', { name: 'Analyser la démo' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choisis un fichier');
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('rejects files that are not .dem without calling the API', async () => {
    const onUpload = vi.fn();
    render(<UploadForm onUpload={onUpload} />);
    const input = screen.getByLabelText('Démo CS2 (.dem)');
    await userEvent.upload(input, new File(['x'], 'notes.txt'), { applyAccept: false });
    await userEvent.click(screen.getByRole('button', { name: 'Analyser la démo' }));
    expect(screen.getByRole('alert')).toHaveTextContent('format .dem');
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('shows the selected file and uploads it', async () => {
    const onUpload = vi.fn(async () => undefined);
    render(<UploadForm onUpload={onUpload} />);
    const file = demo('final.dem');
    await userEvent.upload(screen.getByLabelText('Démo CS2 (.dem)'), file);
    expect(screen.getByText(/final\.dem · 7 o/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Analyser la démo' }));
    expect(onUpload).toHaveBeenCalledWith(file);
    await waitFor(() => expect(screen.queryByText(/final\.dem/)).not.toBeInTheDocument());
  });

  it('maps API errors to a readable message and keeps the selection', async () => {
    const onUpload = vi.fn(async () =>
      Promise.reject(new ApiError(403, 'DAILY_QUOTA_EXCEEDED', 'x')),
    );
    render(<UploadForm onUpload={onUpload} />);
    await userEvent.upload(screen.getByLabelText('Démo CS2 (.dem)'), demo());
    await userEvent.click(screen.getByRole('button', { name: 'Analyser la démo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('démo gratuite du jour');
    expect(screen.getByText(/match\.dem/)).toBeInTheDocument();
  });

  it('disables the form when the quota is used up', () => {
    render(<UploadForm disabled onUpload={vi.fn()} />);
    expect(screen.getByLabelText('Démo CS2 (.dem)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Analyser la démo' })).toBeDisabled();
  });

  it('shows progress while uploading', async () => {
    let finish: () => void = () => undefined;
    const onUpload = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<UploadForm onUpload={onUpload} />);
    await userEvent.upload(screen.getByLabelText('Démo CS2 (.dem)'), demo());
    await userEvent.click(screen.getByRole('button', { name: 'Analyser la démo' }));
    expect(screen.getByRole('button', { name: 'Envoi en cours…' })).toBeDisabled();
    finish();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Analyser la démo' })).toBeEnabled(),
    );
  });
});
