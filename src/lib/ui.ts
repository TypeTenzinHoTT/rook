import ora, { Ora } from 'ora';

export function startSpinnerWithSlowNotice(text: string) {
  const spinner = ora(text).start();
  const slowTimer = setTimeout(() => {
    if (spinner.isSpinning) {
      spinner.text = `${spinner.text} (server might be waking up...)`;
    }
  }, 3000);
  return { spinner, slowTimer };
}

export function stopSpinner(spinner: Ora, slowTimer: NodeJS.Timeout | null, action: 'succeed' | 'fail' | 'stop' = 'stop', message?: string) {
  if (slowTimer) clearTimeout(slowTimer);
  if (action === 'succeed') return spinner.succeed(message);
  if (action === 'fail') return spinner.fail(message);
  spinner.stop();
}

export function formatErrorMessage(err: any): string {
  return err?.response?.data?.error || err?.response?.data?.message || err?.message || String(err);
}
