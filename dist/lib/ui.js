import ora from 'ora';
export function startSpinnerWithSlowNotice(text) {
    const spinner = ora(text).start();
    const slowTimer = setTimeout(() => {
        if (spinner.isSpinning) {
            spinner.text = `${spinner.text} (server might be waking up...)`;
        }
    }, 3000);
    return { spinner, slowTimer };
}
export function stopSpinner(spinner, slowTimer, action = 'stop', message) {
    if (slowTimer)
        clearTimeout(slowTimer);
    if (action === 'succeed')
        return spinner.succeed(message);
    if (action === 'fail')
        return spinner.fail(message);
    spinner.stop();
}
export function formatErrorMessage(err) {
    return err?.response?.data?.error || err?.response?.data?.message || err?.message || String(err);
}
